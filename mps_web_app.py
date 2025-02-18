# Function to process the uploaded Excel file
def process_mps_assessment(uploaded_file):
    try:
        # Load the Excel file
        df = pd.read_excel(uploaded_file)

        # Fill missing values with "N/A" to prevent errors
        df.fillna("N/A", inplace=True)

        # Extract key columns (assuming standard FM Audit/NMAP format)
        columns_needed = ["Device Model", "Serial Number", "IP Address", "Type", "Mono AMV", "Color AMV", "Total AMV", "Status"]
        df = df[columns_needed] if all(col in df.columns for col in columns_needed) else df

        # Generate AI-powered MPS assessment
        assessments = []
        for _, row in df.iterrows():
            prompt = f"""
            Generate a detailed MPS assessment for the following device:
            - **Model**: {row['Device Model']}
            - **Serial Number**: {row['Serial Number']}
            - **IP Address**: {row['IP Address']}
            - **Type**: {row['Type']}
            - **Monthly Mono Pages**: {row['Mono AMV']}
            - **Monthly Color Pages**: {row['Color AMV']}
            - **Total Monthly Volume**: {row['Total AMV']}
            - **Status**: {row['Status']}

            Provide a summary of its efficiency, cost implications, and recommendations.
            """

            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[{"role": "system", "content": "You are an MPS assessment expert."},
                          {"role": "user", "content": prompt}]


            assessments.append(response["choices"][0]["message"]["content"])

        # Add AI-generated assessments to the DataFrame
        df["AI Assessment"] = assessments

        # Save the processed file to Streamlit’s /tmp/ directory
        output_path = "/tmp/MPS_Assessment_Results.xlsx"
        df.to_excel(output_path, index=False)

        return output_path

    except Exception as e:
        return f"Error processing file: {e}"
