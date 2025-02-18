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

            # Correctly formatted f-string with triple quotes
            prompt = f"""Provide an MPS assessment for the following device:
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

            Based on the provided data, analyze the device’s efficiency, cost implications, security risks, and recommend if the device should be retained, upgraded, or replaced."""

            response = openai.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert in managed print services."},
                    {"role": "user", "content": prompt}
                ]
            )

            # Debugging AI Response
            ai_response = response.choices[0].message.content
            st.write(f"📝 AI Response for {row['Model']}: {ai_response}")

            assessments.append(ai_response)

        # Add AI-generated assessments to the DataFrame
        df["AI Assessment"] = assessments

        # Save the processed file
        output_path = "/tmp/MPS_Assessment_Results.xlsx"
        df.to_excel(output_path, index=False)

        # Confirm where the file was saved
        st.write(f"📂 Report saved at: {output_path}")

        return output_path

    except Exception as e:
        st.error(f"🚨 Error processing file: {e}")
        return None

# Streamlit UI
st.title("🖨 AI-Powered MPS Assessment Tool")
st.write("📤 Upload your FM Audit/NMAP Excel file and receive an AI-generated MPS assessment instantly.")

uploaded_file = st.file_uploader("📂 Upload Excel File", type=["xlsx"])

if uploaded_file:
    st.write("⚙ Processing...")

    # Process the file
    output_file = process_mps_assessment(uploaded_file)

    # Check if the file exists before enabling download
    if output_file and os.path.exists(output_file):
        st.success(f"✅ Report successfully saved: {output_file}")
        with open(output_file, "rb") as f:
            st.download_button(
                label="📥 Download AI-Powered MPS Report",
                data=f,
                file_name="MPS_Assessment_Results.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
    else:
        st.error("🚨 Error: The report could not be generated. Please check the processing function.")
