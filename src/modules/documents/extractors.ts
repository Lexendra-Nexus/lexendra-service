import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import Tesseract from 'tesseract.js';
import { PDFParse } from 'pdf-parse';
import { logInfo, logError } from '../../utils/logger.js';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    logInfo('📜 Iniciando extracción de PDF');
    console.log('📄 Tamaño:', buffer.length, 'bytes');

    // PDFParse es una clase - se instancia con opciones que incluyen el buffer
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    
    // Extraer texto de todas las páginas usando getText()
    const textResult = await parser.getText();
    const text = textResult.text || '';
    const pageCount = textResult.pages?.length || 0;

    console.log('✅ Páginas detectadas:', pageCount, '| Texto encontrado:', text.length, 'caracteres');

    // Para PDFs, si tenemos algo de texto, usamos ese texto
    // No intentamos OCR porque Tesseract no soporta PDFs como entrada
    // OCR debería usarse solo para imágenes escaneadas que vienen en otros formatos
    
    console.log('📝 Preview:', text.slice(0, 300).replace(/\n/g, ' '));
    return text;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en PDF:', errorMsg);
    logError('Error extrayendo PDF', error);
    throw new Error(`No pude extraer texto del PDF: ${errorMsg}`);
  }
}

export async function extractFromPDFWithOCR(buffer: Buffer, numPages: number): Promise<string> {
  try {
    console.log(`🔍 OCR en ${numPages} páginas (puede tardar un momento)...`);
    logInfo(`Aplicando OCR a ${numPages} páginas`);
    
    const pagesToProcess = Math.min(numPages, 10);
    console.log(`⚙️ Procesando: ${pagesToProcess}/${numPages} páginas`);
    
    const result = await Tesseract.recognize(buffer, 'spa+eng');
    const text = result.data.text;
    
    console.log('✅ OCR completado:', text.length, 'caracteres');
    return text;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en OCR de PDF:', errorMsg);
    console.warn('⚠️ OCR falló pero continuando sin OCR');
    return '';
  }
}

export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    logInfo('📄 Iniciando extracción de Word');
    console.log('📄 Tamaño:', buffer.length, 'bytes');
    
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    console.log('✅ Extracción completada:', text.length, 'caracteres');
    console.log('📝 Preview:', text.slice(0, 300).replace(/\n/g, ' '));
    
    return text;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en Word:', errorMsg);
    logError('Error extrayendo Word', error);
    throw new Error(`No pude extraer texto del Word: ${errorMsg}`);
  }
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  try {
    logInfo('📊 Iniciando extracción de Excel');
    console.log('📄 Tamaño:', buffer.length, 'bytes');
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let text = '';
    let sheetCount = 0;

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return;
      text += `=== Hoja: ${sheetName} ===\n`;
      text += XLSX.utils.sheet_to_csv(worksheet) + '\n\n';
      sheetCount++;
    });

    console.log('✅ Extracción completada: ', sheetCount, 'hojas |', text.length, 'caracteres');
    console.log('📝 Preview:', text.slice(0, 300).replace(/\n/g, ' '));
    
    return text;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en Excel:', errorMsg);
    logError('Error extrayendo Excel', error);
    throw new Error(`No pude extraer texto del Excel: ${errorMsg}`);
  }
}

export async function extractTextFromPowerPoint(buffer: Buffer): Promise<string> {
  try {
    logInfo('📏 Iniciando extracción de PowerPoint');
    console.log('📄 Tamaño:', buffer.length, 'bytes');
    
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
    let text = '';

    console.log('📄 Diapositivas encontradas:', slideFiles.length);

    for (const path of slideFiles) {
      const xml = await zip.file(path)?.async('text');
      if (!xml) continue;
      const rawMatches = [...xml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)];
      const slideText = rawMatches.map((match) => match[1]).join(' ');
      if (slideText.trim()) {
        text += `${slideText}\n\n`;
      }
    }

    if (!text.trim()) {
      throw new Error('La presentación está vacía o no tiene texto');
    }

    const decodedText = decodeHtmlEntities(text);
    console.log('✅ Extracción completada:', decodedText.length, 'caracteres');
    console.log('📝 Preview:', decodedText.slice(0, 300).replace(/\n/g, ' '));
    
    return decodedText;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en PowerPoint:', errorMsg);
    logError('Error extrayendo PowerPoint', error);
    throw new Error(`No pude extraer texto del PowerPoint: ${errorMsg}`);
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    logInfo('🖼️ Iniciando OCR en imagen');
    console.log('📐 Tamaño de buffer:', buffer.length, 'bytes');
    
    const result = await Tesseract.recognize(buffer, 'spa+eng');
    const extractedText = result.data.text;
    
    console.log('✅ OCR completado:', extractedText.length, 'caracteres');
    console.log('📝 Preview:', extractedText.slice(0, 200).replace(/\n/g, ' '));
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No se detectó texto en la imagen (imagen vacía o ilegible)');
    }
    
    return extractedText;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en OCR:', errorMsg);
    logError('Error en OCR de imagen', error);
    throw new Error(`No pude extraer texto de la imagen: ${errorMsg}`);
  }
}
