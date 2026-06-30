with open('src/scripts/seedFinancials.ts', 'r') as f:
    content = f.read()

# Find the for loop body start (after the company not found check)
start_marker = '    const { ticker,'
start_idx = content.find(start_marker)

# Find the closing of the for loop + main function + module.exports
# Look for the pattern that closes everything
end_marker = '    saved++;\n  }\n'
end_idx = content.find(end_marker)

print(f"start_idx={start_idx}, end_idx={end_idx}")

new_section = '''    const fy = data.fiscalYear;
    const payload = {
      fiscalYear: fy,
      currency: data.currency,
      totalRevenue: data.totalRevenue,
      grossProfit: data.grossProfit,
      operatingIncome: data.operatingIncome,
      netIncome: data.netIncome,
      ebitda: data.ebitda,
      eps: data.eps ?? null,
      researchAndDevelopment: data.researchAndDevelopment ?? null,
      sellingGeneralAdmin: data.sellingGeneralAdmin ?? null,
      interestExpense: data.interestExpense ?? null,
      taxProvision: data.taxProvision ?? null,
      totalAssets: data.totalAssets,
      totalLiabilities: data.totalLiabilities,
      totalEquity: data.totalEquity,
      cashAndEquivalents: data.cashAndEquivalents,
      shortTermInvestments: data.shortTermInvestments ?? null,
      totalCurrentAssets: data.totalCurrentAssets ?? null,
      totalCurrentLiabilities: data.totalCurrentLiabilities ?? null,
      longTermDebt: data.longTermDebt,
      retainedEarnings: data.retainedEarnings ?? null,
      operatingCashFlow: data.operatingCashFlow,
      capitalExpenditures: data.capitalExpenditures,
      freeCashFlow: data.freeCashFlow,
      investingCashFlow: data.investingCashFlow ?? null,
      financingCashFlow: data.financingCashFlow ?? null,
      dividendsPaid: data.dividendsPaid ?? null,
    };
    const existing = await prisma.financialStatement.findFirst({
      where: { companyId: company.id, fiscalYear: fy },
      select: { id: true },
    });
    if (existing) {
      await prisma.financialStatement.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.financialStatement.create({ data: { companyId: company.id, ...payload } });
    }
    console.log(`[seed] ✓ ${data.ticker} FY${fy} saved.`);
    saved++;
  }

  console.log(`[seed] Done. ${saved} saved, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
'''

if start_idx == -1:
    print("ERROR: start marker not found")
else:
    fixed = content[:start_idx] + new_section
    with open('src/scripts/seedFinancials.ts', 'w') as f:
        f.write(fixed)
    print("FIXED OK")
