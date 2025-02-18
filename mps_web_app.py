import streamlit as st
import pandas as pd
import openai
import os

# Set Streamlit file size limit to 20KB
# Set up OpenAI API Key
openai.api_key = "your-api-key"

# Function to process the uploaded Excel file
def process_mps_assessment(uploaded_file):
    try:
        # Check file size before processing
        if uploaded_file.size > 20 * 1024:  # Convert KB to Bytes
            return "Error: File size exceeds 20KB limit."

        # Load the Excel file
        df = pd.read_excel(uploaded_file)

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
            )

            assessments.append(response["choices"][0]["message"]["content"])

        # Add AI-generated assessments to the DataFrame
        df["AI Assessment"] = assessments

        # Save the processed file to Streamlit’s /tmp/ directory
        output_path = "/tmp/MPS_Assessment_Results.xlsx"
        df.to_excel(output_path, index=False)

        return output_path

    except Exception as e:
        return f"Error processing file: {e}"

# Streamlit UI
st.title("AI-Powered MPS Assessment Tool")
st.write("Upload your FM Audit/NMAP Excel file (Max: 20KB) and receive an AI-generated MPS assessment instantly.")

uploaded_file = st.file_uploader("Upload Excel File", type=["xlsx"])

if uploaded_file:
    if uploaded_file.size > 20 * 1024:
        st.error("Error: The uploaded file exceeds the 20KB size limit. Please upload a smaller file.")
    else:
        st.write("Processing...")

        # Process the file
        output_file = process_mps_assessment(uploaded_file)

        # Ensure the file was created before attempting download
        if os.path.exists(output_file):
            with open(output_file, "rb") as f:
                st.download_button(
                    label="Download AI-Powered MPS Report",
                    data=f,
                    file_name="MPS_Assessment_Results.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
        else:
            st.error("Error: The report could not be generated. Please check the processing function.")

