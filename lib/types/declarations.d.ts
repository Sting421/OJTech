declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: any;
    text: string;
    version: string;
  }

  function PDFParse(dataBuffer: Buffer, options?: Record<string, any>): Promise<PDFData>;
  
  export = PDFParse;
} 