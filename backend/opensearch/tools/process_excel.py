import pandas as pd

excel_file = "/Users/qfu/Documents/workspace/ecoSeal/opensearch/Cut-off_Cumulative_LCIA_v3.10.1.xlsx"

# We'll read the smaller sheet "用于测试的数据（完成清洗）"
df = pd.read_excel(excel_file, sheet_name="用于测试的数据（完成清洗）")

# The first few lines contain placeholders. We want real data starting row 2 or 3, etc.
# Observing the data, row 2 has column headers. We can remove the first couple of rows if needed:
# If the actual headers are in row 2, for instance:
df.columns = df.iloc[2]  # use the row 2 as column names
df = df.drop([0, 1, 2]).reset_index(drop=True)

# The columns might still have some NaN or spacing in the header text; you can clean them:
df.columns = [str(col).strip() for col in df.columns]

# Now export to CSV:
df.to_csv(
    "/Users/qfu/Documents/workspace/ecoSeal/opensearch/cleaned_data.csv", index=False
)
