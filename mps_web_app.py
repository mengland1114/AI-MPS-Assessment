import streamlit as st
import pandas as pd
import openai
import os

# Set up OpenAI API Key (Replace 'your-api-key' with your actual API key)
openai.api_key = "your-api-key"

# Function to process the uploaded Excel file and generate AI-powered MPS assessment
def process_mps_assessment(uploaded_file):
    try:
        # Load the Excel file
        df = pd.read_excel(uploaded_file)

        # Display detected column headers
        st.write("🔍 Detected Columns in File:", df.columns.tolist())

        # Ensure "Model" column exists and filter out blank rows
        if "Model" not in df.columns:
            st.error("🚨 Error: 'Model' column is missing!")
            return None

        # Remove rows where "Model" is empty
        df = df[df["Model"].notna()]

        # Limit processing to first 500 valid devices for efficiency
        df = df.head(500)

        # Fill missing values with "N/A" to prevent errors
        df.fillna("N/A", inplace=True)

        # Generate AI-powered MPS assessment
        assessments = []
        for index, row in df.iterrows():
            st.write(f"⚙ Processing device {index + 1} of {len(df)}: {row['Model']}...")

            prompt = f"""
            Provide an MPS assessment for the following device:
            - **Manufacturer**: {row['Manufacturer']}
            - **Model**: {row['Model']}
            - **Serial Number**: {row['Serial Number']}
            - **IP Address**: {row['IP Address']}
            - **Device Type**: {row['Device Type']}
            - **Mono AMV**: {row['Mono AMV']}
            - **Color AMV**: {row['Color AMV']}
            - **Total AMV**: {row['Total AMV']}
            - **Monthly Duty Cycle**: {row['Monthly Duty Cycle']}
            - **Speed (Mono/Color)**: {row['Speed Mono']} / {row['Speed Color']}
            - **MSRP**: {row['MSRP']}
            - **Street Price**: {row['Street Price']}
            - **Date Introduced**: {row['Date Introduced']}
            - **Date Discontinued**: {row['Date Discontinued']}
            - **Networked**: {row['Is Networked']}
            - **Printer Status**: {row['Printer Status']}
            - **Firmware Versions**: {row['Firmware Version 1']}, {row['Firmware Version 2']}, {row['Firmware Version 3']}, {row['Firmware Version 4']}

            Based on the provided data, analyze the device’s efficiency, cost implications, security risks, and recommend if the device should be retained, upgraded, or replaced.
        
