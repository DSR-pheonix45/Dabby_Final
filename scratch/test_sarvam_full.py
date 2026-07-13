import sarvamai
from sarvamai.client import SarvamAI
import os
import time
import requests
import io
import zipfile
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("SARVAM_API_KEY")
client = SarvamAI(api_subscription_key=api_key)

def test_full():
    file_path = r"C:\Users\Medhansh Pc\Desktop\Dabby_Final\dist\Basic Set (3).png"
    file_name = os.path.basename(file_path)
    
    try:
        job = client.document_intelligence.create_job(language='en-IN', output_format='md')
        job_id = job.id if hasattr(job, "id") else getattr(job, "job_id", getattr(job, "jobId", None))
        
        upload_resp = client.document_intelligence.get_upload_links(job_id=job_id, files=[file_name])
        
        urls_dict = upload_resp.upload_urls
        upload_url = urls_dict[file_name].file_url
        
        with open(file_path, "rb") as f:
            headers = {"x-ms-blob-type": "BlockBlob"}
            res = requests.put(upload_url, data=f, headers=headers)
            
        client.document_intelligence.start(job_id=job_id)
        
        while True:
            status = client.document_intelligence.get_status(job_id=job_id)
            state = getattr(status, "job_state", getattr(status, "status", None))
            if state in ["Completed", "Failed", "Completed_with_errors"]:
                break
            time.sleep(2)
            
        download = client.document_intelligence.get_download_links(job_id=job_id)
        zip_url = download.download_urls['document.zip'].file_url
        
        # Download the zip
        zip_res = requests.get(zip_url)
        with zipfile.ZipFile(io.BytesIO(zip_res.content)) as z:
            print("Files in ZIP:", z.namelist())
            for name in z.namelist():
                if name.endswith('.md') or name.endswith('.txt'):
                    content = z.read(name).decode('utf-8')
                    print(f"--- Content of {name} ---")
                    print(content)
        
    except Exception as e:
        print(e)

if __name__ == "__main__":
    test_full()
