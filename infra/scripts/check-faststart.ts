import fs from "node:fs";
import path from "node:path";

/**
 * Inspeciona os átomos (boxes) de um arquivo MP4 para determinar
 * se o 'moov atom' está posicionado antes do 'mdat' (FastStart habilitado).
 */
export function checkMp4FastStart(filePath: string): {
  isFastStart: boolean;
  moovOffset: number | null;
  mdatOffset: number | null;
  error?: string;
} {
  if (!fs.existsSync(filePath)) {
    return { isFastStart: false, moovOffset: null, mdatOffset: null, error: "Arquivo inexistente" };
  }

  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(16);

  let offset = 0;
  const fileSize = fs.statSync(filePath).size;
  let moovOffset: number | null = null;
  let mdatOffset: number | null = null;

  try {
    while (offset < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, 8, offset);
      if (bytesRead < 8) break;

      const size = buffer.readUInt32BE(0);
      const type = buffer.toString("latin1", 4, 8);

      if (type === "moov" && moovOffset === null) {
        moovOffset = offset;
      } else if (type === "mdat" && mdatOffset === null) {
        mdatOffset = offset;
      }

      if (moovOffset !== null && mdatOffset !== null) {
        break;
      }

      // Se o tamanho for 1, é um átomo de 64-bit (large size)
      if (size === 1) {
        const largeBuffer = Buffer.alloc(8);
        fs.readSync(fd, largeBuffer, 0, 8, offset + 8);
        const high = largeBuffer.readUInt32BE(0);
        const low = largeBuffer.readUInt32BE(4);
        const largeSize = high * 2 ** 32 + low;
        offset += largeSize;
      } else if (size === 0) {
        // Átomo vai até o fim do arquivo
        break;
      } else {
        offset += size;
      }
    }

    const isFastStart = moovOffset !== null && (mdatOffset === null || moovOffset < mdatOffset);
    return { isFastStart, moovOffset, mdatOffset };
  } catch (err: any) {
    return { isFastStart: false, moovOffset: null, mdatOffset: null, error: err.message };
  } finally {
    fs.closeSync(fd);
  }
}

// Execução direta via CLI (npx tsx infra/scripts/check-faststart.ts <arquivo.mp4>)
if (require.main === module) {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.log("Uso: npx tsx infra/scripts/check-faststart.ts <caminho-do-arquivo.mp4>");
    process.exit(0);
  }

  const fullPath = path.resolve(targetPath);
  console.log(`🔍 Verificando FastStart em: ${fullPath}...`);
  const result = checkMp4FastStart(fullPath);

  if (result.error) {
    console.error(`❌ Erro: ${result.error}`);
    process.exit(1);
  }

  if (result.isFastStart) {
    console.log(`✅ [OK] Vídeo otimizado para Streaming (FastStart ativo)!`);
    console.log(`   - moov atom no byte: ${result.moovOffset}`);
    console.log(`   - mdat atom no byte: ${result.mdatOffset}`);
  } else {
    console.warn(
      `⚠️ [ATENÇÃO] O vídeo NÃO possui FastStart (o 'moov atom' está após os dados de mídia).`,
    );
    console.warn(`   Para corrigir e acelerar o streaming no Google Drive, execute:`);
    console.warn(
      `   ffmpeg -i "${path.basename(fullPath)}" -c copy -movflags +faststart "otimizado-${path.basename(fullPath)}"`,
    );
  }
}
