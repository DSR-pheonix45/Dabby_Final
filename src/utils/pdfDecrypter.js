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

export async function verifyPdfPassword(file, password) {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = getDocument({ data: arrayBuffer, password });
    await loadingTask.promise;
    return true; // Password is correct
  } catch (error) {
    if (error.name === 'PasswordException') {
      throw new Error('Incorrect password');
    }
    throw error;
  }
}
