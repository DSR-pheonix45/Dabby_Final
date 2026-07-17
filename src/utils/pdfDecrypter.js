import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { jsPDF } from "jspdf";

GlobalWorkerOptions.workerSrc = pdfWorker;

export async function checkPdfPassword(file) {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = getDocument({ data: arrayBuffer });
    await loadingTask.promise;
    return false; // Not password protected
  } catch (error) {
    if (error.name === 'PasswordException') {
      return true;
    }
    // If it fails for another reason, we just say it's not password protected
    // and let the normal pipeline handle the error.
    return false;
  }
}

export async function unlockPdf(file, password) {
  const arrayBuffer = await file.arrayBuffer();
  let pdf;
  try {
    const loadingTask = getDocument({ data: arrayBuffer, password });
    pdf = await loadingTask.promise;
  } catch (error) {
    if (error.name === 'PasswordException') {
      throw new Error('Incorrect password');
    }
    throw error;
  }

  // Scan pages and create new PDF
  const newPdf = new jsPDF('p', 'pt', 'a4');
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR quality
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (pageNum > 1) {
      newPdf.addPage();
    }
    
    // Scale image to fit A4 page
    const pdfWidth = newPdf.internal.pageSize.getWidth();
    const pdfHeight = newPdf.internal.pageSize.getHeight();
    const imgRatio = canvas.width / canvas.height;
    const pdfRatio = pdfWidth / pdfHeight;
    
    let drawWidth = pdfWidth;
    let drawHeight = pdfHeight;
    if (imgRatio > pdfRatio) {
      drawHeight = pdfWidth / imgRatio;
    } else {
      drawWidth = pdfHeight * imgRatio;
    }
    
    newPdf.addImage(imgData, 'JPEG', 0, 0, drawWidth, drawHeight);
  }

  const pdfBlob = newPdf.output('blob');
  const newName = file.name.replace(/\.[^/.]+$/, "") + "_unlocked.pdf";
  return new File([pdfBlob], newName, { type: 'application/pdf' });
}
