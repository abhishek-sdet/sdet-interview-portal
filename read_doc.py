import mammoth
import sys

try:
    file_path = r'c:\Users\abhishek.johri\OneDrive - SDET TECH\Documents\SDET Apps\ALL the app for fresher drive\SDET_Tech_Interview_Question_Paper_Set_A.docx'
    
    with open(file_path, 'rb') as docx_file:
        result = mammoth.extract_raw_text(docx_file)
        text = result.value
        
        # Print first 6000 characters
        print("=== DOCUMENT CONTENT (first 6000 chars) ===")
        print(text[:6000])
        print("\n=== END ===")
        
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
