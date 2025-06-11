import { Injectable } from '@nestjs/common';
import { error } from 'console';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

@Injectable()
export class ReportsService {
  private states: {
    accounts: string;
    yearly: string;
    fs: string;
    error: null | { message: string; timestamp: string; stack: any };
  } = {
    accounts: 'idle',
    yearly: 'idle',
    fs: 'idle',
    error: null,
  };
  private fileCache: Record<string, Array<Array<string | number>>> = {};

  state(scope: string) {
    return this.states[scope];
  }

  async accounts() {
    this.states.accounts = 'starting';
    const start = performance.now();
    const tmpDir = 'tmp';
    const outputFile = 'out/accounts.csv';
    const accountBalances: Record<string, number> = {};
    const files = await fs.readdir(tmpDir)
    const process = files.map(async (file) => {
      if (file.endsWith('.csv')) {
        const lines = await this.readFileCached(path.join(tmpDir, file), 'utf-8')
        for (const line of lines) {
          const [, account, , debit, credit] = line;
          if (!accountBalances[account]) {
            accountBalances[account] = 0;
          }
          accountBalances[account] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }
      }
    });
    await Promise.all(process);
    const output = ['Account,Balance'];
    for (const [account, balance] of Object.entries(accountBalances)) {
      output.push(`${account},${balance.toFixed(2)}`);
    }
    await fs.writeFile(outputFile, output.join('\n'));
    this.states.accounts = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  async yearly() {
    this.states.yearly = 'starting';
    const start = performance.now();
    const tmpDir = 'tmp';
    const outputFile = 'out/yearly.csv';
    const cashByYear: Record<string, number> = {};
    const files = await fs.readdir(tmpDir);
    const process = files.map(async (file) => {
      if (file.endsWith('.csv') && file !== 'yearly.csv') {
        const lines = await this.readFileCached(path.join(tmpDir, file), 'utf-8')
        for (const line of lines) {
          const [date, account, , debit, credit] = line;
          if (account === 'Cash') {
            const year = new Date(date).getFullYear();
            if (!cashByYear[year]) {
              cashByYear[year] = 0;
            }
            cashByYear[year] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });
    await Promise.all(process);
    const output = ['Financial Year,Cash Balance'];
    Object.keys(cashByYear)
      .sort()
      .forEach((year) => {
        output.push(`${year},${cashByYear[year].toFixed(2)}`);
      });
    await fs.writeFile(outputFile, output.join('\n'));
    this.states.yearly = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  async fs() {
    this.states.fs = 'starting';
    const start = performance.now();
    const tmpDir = 'tmp';
    const outputFile = 'out/fs.csv';
    const categories = {
      'Income Statement': {
        Revenues: ['Sales Revenue'],
        Expenses: [
          'Cost of Goods Sold',
          'Salaries Expense',
          'Rent Expense',
          'Utilities Expense',
          'Interest Expense',
          'Tax Expense',
        ],
      },
      'Balance Sheet': {
        Assets: [
          'Cash',
          'Accounts Receivable',
          'Inventory',
          'Fixed Assets',
          'Prepaid Expenses',
        ],
        Liabilities: [
          'Accounts Payable',
          'Loan Payable',
          'Sales Tax Payable',
          'Accrued Liabilities',
          'Unearned Revenue',
          'Dividends Payable',
        ],
        Equity: ['Common Stock', 'Retained Earnings'],
      },
    };
    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
      for (const group of Object.values(section)) {
        for (const account of group) {
          balances[account] = 0;
        }
      }
    }
    const files = await fs.readdir(tmpDir)
    const process = files.map(async (file) => {
      if (file.endsWith('.csv') && file !== 'fs.csv') {
        const lines = await this.readFileCached(path.join(tmpDir, file), 'utf-8')

        for (const line of lines) {
          const [, account, , debit, credit] = line;

          if (balances.hasOwnProperty(account)) {
            balances[account] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });
    await Promise.all(process);

    const output: string[] = [];
    output.push('Basic Financial Statement');
    output.push('');
    output.push('Income Statement');
    let totalRevenue = 0;
    let totalExpenses = 0;
    for (const account of categories['Income Statement']['Revenues']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalRevenue += value;
    }
    for (const account of categories['Income Statement']['Expenses']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalExpenses += value;
    }
    output.push(`Net Income,${(totalRevenue - totalExpenses).toFixed(2)}`);
    output.push('');
    output.push('Balance Sheet');
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    output.push('Assets');
    for (const account of categories['Balance Sheet']['Assets']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalAssets += value;
    }
    output.push(`Total Assets,${totalAssets.toFixed(2)}`);
    output.push('');
    output.push('Liabilities');
    for (const account of categories['Balance Sheet']['Liabilities']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalLiabilities += value;
    }
    output.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`);
    output.push('');
    output.push('Equity');
    for (const account of categories['Balance Sheet']['Equity']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalEquity += value;
    }
    output.push(
      `Retained Earnings (Net Income),${(totalRevenue - totalExpenses).toFixed(2)}`,
    );
    totalEquity += totalRevenue - totalExpenses;
    output.push(`Total Equity,${totalEquity.toFixed(2)}`);
    output.push('');
    output.push(
      `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
    );
    await fs.writeFile(outputFile, output.join('\n'));
    this.states.fs = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  async runTasks() {
    this.states.error = null
    try {
      await this.accounts();
      await this.yearly();
      await this.fs();
    } catch (e) {
      this.states.error = {
        message: 'Error: ' + e.message,
        timestamp: new Date().toISOString(),
        stack: e.stack,
      };
      this.states.accounts = 'error';
      this.states.yearly = 'error';
      this.states.fs = 'error';
      throw e; // rethrow the error to be handled by the caller
    }
    return
  }

  async readFileCached(filePath: string, encoding: string = 'utf-8'): Promise<Array<Array<string | number>>> {
    if (this.fileCache[filePath]) {
      console.log(`Cache hit for ${filePath}`); 
      return this.fileCache[filePath];
    }
    // Read the file and cache its content
    const buff = await fs.readFile(filePath, encoding as BufferEncoding);
    const content: Array<Array<string | number>>= []
    const lines = buff.trim().split('\n');
        for (const line of lines) {
          content.push(line.split(','));
        }
    this.fileCache[filePath] = content;
    return content;
  }
}
