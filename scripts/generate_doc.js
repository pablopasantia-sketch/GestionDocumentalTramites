const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

// Constantes de estilo APA y tipografía
const FONT_NAME = 'Times New Roman';
const FONT_SIZE_BODY = 24;      // 12 pt en half-points
const FONT_SIZE_H1 = 28;        // 14 pt
const FONT_SIZE_H2 = 24;        // 12 pt
const FONT_SIZE_H3 = 24;        // 12 pt
const FONT_SIZE_SMALL = 20;     // 10 pt
const LINE_SPACING_1_5 = 360;   // Interlineado 1.5 líneas (240 = 1.0, 360 = 1.5, 480 = 2.0)
const INDENT_FIRST_LINE = 720;  // Sangría de primera línea APA: 0.5 pulgadas (1.27 cm) = 720 twips

// Estilos de bordes APA para tablas (líneas horizontales limpias, sin verticales)
const borderAPA_TopBottom = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: "000000"
};

const borderAPA_HeaderBottom = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: "000000"
};

const borderNone = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF"
};

// Funciones auxiliares de formato
function createParagraph(text, options = {}) {
  const isIndented = options.indent !== undefined ? options.indent : true;
  const alignment = options.alignment || AlignmentType.JUSTIFIED;
  const spacingAfter = options.spacingAfter !== undefined ? options.spacingAfter : 120;
  const spacingBefore = options.spacingBefore !== undefined ? options.spacingBefore : 0;

  return new Paragraph({
    alignment: alignment,
    indent: isIndented ? { firstLine: INDENT_FIRST_LINE } : { firstLine: 0 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: spacingBefore,
      after: spacingAfter
    },
    children: [
      new TextRun({
        text: text,
        font: FONT_NAME,
        size: options.size || FONT_SIZE_BODY,
        bold: options.bold || false,
        italics: options.italics || false,
        color: options.color || "000000"
      })
    ]
  });
}

function createRunsParagraph(runs, options = {}) {
  const isIndented = options.indent !== undefined ? options.indent : true;
  const alignment = options.alignment || AlignmentType.JUSTIFIED;
  const spacingAfter = options.spacingAfter !== undefined ? options.spacingAfter : 120;
  const spacingBefore = options.spacingBefore !== undefined ? options.spacingBefore : 0;

  return new Paragraph({
    alignment: alignment,
    indent: isIndented ? { firstLine: INDENT_FIRST_LINE } : { firstLine: 0 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: spacingBefore,
      after: spacingAfter
    },
    children: runs.map(r => new TextRun({
      text: r.text,
      font: FONT_NAME,
      size: r.size || FONT_SIZE_BODY,
      bold: r.bold || false,
      italics: r.italics || false,
      color: r.color || "000000"
    }))
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: 360,
      after: 180
    },
    children: [
      new TextRun({
        text: text,
        font: FONT_NAME,
        size: FONT_SIZE_H1,
        bold: true,
        color: "000000"
      })
    ]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: 280,
      after: 140
    },
    children: [
      new TextRun({
        text: text,
        font: FONT_NAME,
        size: FONT_SIZE_H2,
        bold: true,
        color: "000000"
      })
    ]
  });
}

function createHeading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: 200,
      after: 100
    },
    children: [
      new TextRun({
        text: text,
        font: FONT_NAME,
        size: FONT_SIZE_H3,
        bold: true,
        italics: true,
        color: "000000"
      })
    ]
  });
}

function createBulletItem(title, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720, hanging: 360 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: 60,
      after: 100
    },
    children: [
      new TextRun({
        text: "• " + (title ? title + ": " : ""),
        font: FONT_NAME,
        size: FONT_SIZE_BODY,
        bold: !!title,
        color: "000000"
      }),
      new TextRun({
        text: text,
        font: FONT_NAME,
        size: FONT_SIZE_BODY,
        bold: false,
        color: "000000"
      })
    ]
  });
}

function createFigureBlock(figNumber, figTitle, descriptionText, noteText) {
  return [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 0 },
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({
          text: `Figura ${figNumber}`,
          font: FONT_NAME,
          size: FONT_SIZE_BODY,
          bold: true
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 0 },
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: figTitle,
          font: FONT_NAME,
          size: FONT_SIZE_BODY,
          italics: true
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: `[REPRESENTACIÓN GRÁFICA / DIAGRAMA: ${figTitle.toUpperCase()}]\n${descriptionText}`,
          font: FONT_NAME,
          size: FONT_SIZE_SMALL,
          italics: true,
          color: "333333"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 0 },
      spacing: { before: 60, after: 240 },
      children: [
        new TextRun({
          text: `Nota. `,
          font: FONT_NAME,
          size: FONT_SIZE_SMALL,
          italics: true
        }),
        new TextRun({
          text: `${noteText} Fuente: Elaboración propia basada en la arquitectura del Sistema Wayka.`,
          font: FONT_NAME,
          size: FONT_SIZE_SMALL
        })
      ]
    })
  ];
}

function createAPATable(headers, rows, widths = []) {
  const tableRows = [];

  // Header row
  tableRows.push(new TableRow({
    tableHeader: true,
    children: headers.map((headerText, i) => new TableCell({
      width: widths[i] ? { size: widths[i], type: WidthType.DXA } : undefined,
      borders: {
        top: borderAPA_TopBottom,
        bottom: borderAPA_HeaderBottom,
        left: borderNone,
        right: borderNone
      },
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          indent: { firstLine: 0 },
          spacing: { line: 240, before: 40, after: 40 },
          children: [
            new TextRun({
              text: headerText,
              font: FONT_NAME,
              size: FONT_SIZE_SMALL,
              bold: true,
              color: "000000"
            })
          ]
        })
      ]
    }))
  }));

  // Body rows
  rows.forEach((row, rowIndex) => {
    const isLastRow = rowIndex === rows.length - 1;
    tableRows.push(new TableRow({
      children: row.map((cellText, colIndex) => new TableCell({
        width: widths[colIndex] ? { size: widths[colIndex], type: WidthType.DXA } : undefined,
        borders: {
          top: borderNone,
          bottom: isLastRow ? borderAPA_TopBottom : borderNone,
          left: borderNone,
          right: borderNone
        },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [
          new Paragraph({
            alignment: colIndex === 0 ? AlignmentType.LEFT : (widths[colIndex] < 1800 ? AlignmentType.CENTER : AlignmentType.LEFT),
            indent: { firstLine: 0 },
            spacing: { line: 240, before: 40, after: 40 },
            children: [
              new TextRun({
                text: cellText,
                font: FONT_NAME,
                size: FONT_SIZE_SMALL,
                color: "000000"
              })
            ]
          })
        ]
      }))
    }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderAPA_TopBottom,
      bottom: borderAPA_TopBottom,
      left: borderNone,
      right: borderNone,
      insideHorizontal: borderNone,
      insideVertical: borderNone
    },
    rows: tableRows
  });
}

function createSectionCover(title, subtitle, description) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      spacing: { before: 3600, after: 360 },
      children: [
        new TextRun({
          text: title,
          font: FONT_NAME,
          size: 36, // 18 pt
          bold: true,
          color: "000000"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: subtitle,
          font: FONT_NAME,
          size: 26, // 13 pt
          italics: true,
          color: "333333"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: description,
          font: FONT_NAME,
          size: FONT_SIZE_BODY,
          color: "555555"
        })
      ]
    })
  ];
}

console.log("Generador de estructura y helpers configurados exitosamente.");

