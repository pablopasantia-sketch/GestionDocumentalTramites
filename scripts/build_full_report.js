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
const FONT_SIZE_BODY = 24;      // 12 pt (media-puntos)
const FONT_SIZE_H1 = 28;        // 14 pt
const FONT_SIZE_H2 = 24;        // 12 pt
const FONT_SIZE_H3 = 24;        // 12 pt
const FONT_SIZE_SMALL = 20;     // 10 pt
const LINE_SPACING_1_5 = 360;   // Interlineado 1.5 líneas (360 twips)
const INDENT_FIRST_LINE = 720;  // Sangría primera línea APA 0.5 pulg = 720 twips

// Bordes formales APA (blanco, negro, escala de grises sobria)
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

function p(text, options = {}) {
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

function pRuns(runs, options = {}) {
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

function h1(text) {
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

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: 260,
      after: 120
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

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: {
      line: LINE_SPACING_1_5,
      before: 180,
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

function bullet(title, text) {
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

function figureAPA(figNum, figTitle, desc, note) {
  return [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 0 },
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({
          text: `Figura ${figNum}`,
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
          text: `[REPRESENTACIÓN GRÁFICA / DIAGRAMA ARQUITECTÓNICO: ${figTitle.toUpperCase()}]\n${desc}`,
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
          text: `${note} Fuente: Elaboración propia basada en la arquitectura del Sistema Wayka para el Concejo Municipal de Sucre.`,
          font: FONT_NAME,
          size: FONT_SIZE_SMALL
        })
      ]
    })
  ];
}

function tableAPA(headers, rows, widths = []) {
  const tableRows = [];

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

function carátulaAnexo(numero, titulo, subtitulo, detalle) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      spacing: { before: 3600, after: 360 },
      children: [
        new TextRun({
          text: `ANEXO ${numero}`,
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
          text: titulo,
          font: FONT_NAME,
          size: 28, // 14 pt
          bold: true,
          color: "222222"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      spacing: { before: 120, after: 360 },
      children: [
        new TextRun({
          text: subtitulo,
          font: FONT_NAME,
          size: 24, // 12 pt
          italics: true,
          color: "444444"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      spacing: { before: 240, after: 240 },
      children: [
        new TextRun({
          text: detalle,
          font: FONT_NAME,
          size: FONT_SIZE_BODY,
          color: "555555"
        })
      ]
    })
  ];
}

console.log("Configuración inicial lista. Procediendo a redactar contenido...");

const docElements = [];

// ==============================================================================
// 1. PORTADA FORMAL / CARÁTULA ACADÉMICA
// ==============================================================================
docElements.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({
        text: "UNIVERSIDAD MAYOR, REAL Y PONTIFICIA DE SAN FRANCISCO XAVIER DE CHUQUISACA",
        font: FONT_NAME,
        size: 26,
        bold: true
      })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({
        text: "FACULTAD DE TECNOLOGÍA",
        font: FONT_NAME,
        size: 24,
        bold: true
      })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 0, after: 480 },
    children: [
      new TextRun({
        text: "CARRERA DE INGENIERÍA DE SISTEMAS / CIENCIAS DE LA COMPUTACIÓN",
        font: FONT_NAME,
        size: 22,
        bold: true
      })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 600, after: 240 },
    children: [
      new TextRun({
        text: "INFORME FINAL DE PRÁCTICA LABORAL",
        font: FONT_NAME,
        size: 32, // 16 pt
        bold: true
      })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 120, after: 240 },
    children: [
      new TextRun({
        text: "MODALIDAD: PRÁCTICA LABORAL EN INSTITUCIÓN PÚBLICA (SHC170)",
        font: FONT_NAME,
        size: 24,
        italics: true
      })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 360, after: 720 },
    children: [
      new TextRun({
        text: "DESARROLLO E IMPLEMENTACIÓN DEL SISTEMA DE GESTIÓN DOCUMENTAL Y WORKFLOW INSTITUCIONAL (WAYKA) PARA EL CONCEJO MUNICIPAL DE SUCRE",
        font: FONT_NAME,
        size: 26,
        bold: true
      })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0, left: 1440 },
    spacing: { before: 600, after: 120 },
    children: [
      new TextRun({ text: "Estudiante:\t\t\t", font: FONT_NAME, size: FONT_SIZE_BODY, bold: true }),
      new TextRun({ text: "Pablo Jancko", font: FONT_NAME, size: FONT_SIZE_BODY })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0, left: 1440 },
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({ text: "Tutor Institucional:\t\t", font: FONT_NAME, size: FONT_SIZE_BODY, bold: true }),
      new TextRun({ text: "[Información no especificada / Completar por el estudiante]", font: FONT_NAME, size: FONT_SIZE_BODY, italics: true })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0, left: 1440 },
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({ text: "Docente Supervisor:\t\t", font: FONT_NAME, size: FONT_SIZE_BODY, bold: true }),
      new TextRun({ text: "[Información no especificada / Completar por el estudiante]", font: FONT_NAME, size: FONT_SIZE_BODY, italics: true })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0, left: 1440 },
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({ text: "Institución Receptora:\t", font: FONT_NAME, size: FONT_SIZE_BODY, bold: true }),
      new TextRun({ text: "Concejo Municipal de Sucre (CMS)", font: FONT_NAME, size: FONT_SIZE_BODY })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0, left: 1440 },
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({ text: "Periodo de Ejecución:\t", font: FONT_NAME, size: FONT_SIZE_BODY, bold: true }),
      new TextRun({ text: "01 de Septiembre al 19 de Noviembre de 2026", font: FONT_NAME, size: FONT_SIZE_BODY })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 1200, after: 0 },
    children: [
      new TextRun({
        text: "Sucre – Bolivia\nGestión 2026",
        font: FONT_NAME,
        size: 22,
        bold: true
      })
    ]
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// ==============================================================================
// 1. RESUMEN (Regla: Párrafo contiguo que NO supere las 70 palabras)
// ==============================================================================
docElements.push(
  h1("1. RESUMEN"),
  p(
    "Durante tres meses de práctica laboral en el Concejo Municipal de Sucre, se reconstruyó el sistema informático Wayka mediante ingeniería inversa de manuales legados, arquitectura en capas, ASP.NET Core, React y SQL Server. Se desarrollaron módulos de ventanilla única, derivación documental con SLA, circuito legislativo plenario y consulta ciudadana transparente, optimizando la trazabilidad institucional y eliminando el extravío de expedientes físicos.",
    { indent: true, spacingAfter: 240 }
  ),
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 0 },
    spacing: { before: 60, after: 240 },
    children: [
      new TextRun({ text: "Palabras clave: ", font: FONT_NAME, size: FONT_SIZE_BODY, bold: true, italics: true }),
      new TextRun({ text: "Gestión documental, Workflow, Concejo Municipal de Sucre, ASP.NET Core, React, T-SQL, Trazabilidad.", font: FONT_NAME, size: FONT_SIZE_BODY, italics: true })
    ]
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// ==============================================================================
// 2. EJEMPLO DE TEXTO DE RESUMEN
// ==============================================================================
docElements.push(
  h1("2. EJEMPLO DE TEXTO DE RESUMEN"),
  p(
    "En correspondencia con las directrices metodológicas y la reglamentación formal de la modalidad de Práctica Laboral (SHC170), el resumen ejecutivo debe presentarse como un bloque textual unificado y condensado, restringido a un máximo de setenta palabras contiguas. Dicho apartado tiene como propósito permitir que evaluadores y comisiones académicas identifiquen de manera instantánea el objeto de intervención, la institución patrocinante, el marco temporal, la fundamentación metodológica y el impacto práctico derivado del proyecto.",
    { indent: true }
  ),
  p(
    "A continuación, se expone como referencia literal y modelo curricular el texto formal empleado para la acreditación técnica de la presente práctica laboral en la Facultad de Tecnología:",
    { indent: true }
  ),
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720, right: 720, firstLine: 0 },
    spacing: { line: LINE_SPACING_1_5, before: 180, after: 180 },
    children: [
      new TextRun({
        text: "«Durante tres meses de práctica laboral en el Concejo Municipal de Sucre, se reconstruyó el sistema informático Wayka mediante ingeniería inversa de manuales legados, arquitectura en capas, ASP.NET Core, React y SQL Server. Se desarrollaron módulos de ventanilla única, derivación documental con SLA, circuito legislativo plenario y consulta ciudadana transparente, optimizando la trazabilidad institucional y eliminando el extravío de expedientes físicos.»",
        font: FONT_NAME,
        size: FONT_SIZE_BODY,
        italics: true
      })
    ]
  }),
  p(
    "El desglose analítico de los elementos obligatorios contenidos en el resumen modelo se articula bajo la siguiente correspondencia sintética:",
    { indent: true }
  ),
  bullet("Qué se hizo", "Reconstrucción e implementación del sistema informático institucional Wayka para la gestión de trámites documentales y flujos de trabajo (workflow)."),
  bullet("Dónde se hizo", "Concejo Municipal de Sucre (Gobierno Autónomo Municipal de Sucre, Sucre - Bolivia)."),
  bullet("Por cuánto tiempo se hizo", "Periodo continuo de tres meses calendario (01 de Septiembre al 19 de Noviembre de 2026)."),
  bullet("Cómo se hizo", "Ingeniería inversa sobre manuales y artefactos legados, desarrollo desacoplado en capas bajo ASP.NET Core (.NET 8 LTS), frontend reactivo en React 19 y base de datos relacional Microsoft SQL Server con procedimientos almacenados."),
  bullet("Resultados alcanzados", "Despliegue de ventanilla única, derivación documental en tiempo real, semaforización de plazos SLA de 5 a 15 días, circuito de firmas duales y consulta pública transparente."),
  new Paragraph({ children: [new PageBreak()] })
);

// ==============================================================================
// 1. CONTEXTO
// ==============================================================================
docElements.push(
  h1("1. CONTEXTO"),
  h2("1.1. GENERALIDADES"),
  h3("1.1.1. Descripción de la empresa"),
  p(
    "El Concejo Municipal de Sucre (CMS) constituye el órgano legislativo, deliberativo y fiscalizador del Gobierno Autónomo Municipal de Sucre, sede histórica y capital constitucional del Estado Plurinacional de Bolivia. Enmarcado jurídica e institucionalmente en la Constitución Política del Estado y la Ley N° 482 de Gobiernos Autónomos Municipales, el Concejo ostenta la máxima jerarquía representativa y normativa dentro de la jurisdicción municipal, caracterizándose por ser un cuerpo colegiado conformado por concejales electos democráticamente por sufragio popular.",
    { indent: true }
  ),
  p(
    "A diferencia del Órgano Ejecutivo Municipal (Alcaldía), cuya función primordial radica en la ejecución administrativa, financiera y la prestación directa de servicios y obras públicas, el Concejo Municipal ejerce la potestad legislativa mediante la formulación, debate y promulgación de Leyes Municipales, así como el control riguroso de los recursos públicos a través de mecanismos formales de fiscalización. En el ejercicio cotidiano de sus atribuciones, el Concejo recibe un volumen masivo y continuo de notas, memoriales, denuncias vecinales, proyectos normativos y contratos administrativos provenientes tanto de la ciudadanía chuquisaqueña como de organizaciones sociales, instituciones descentralizadas y del propio Alcalde Municipal.",
    { indent: true }
  ),
  p(
    "Históricamente, la tramitación y derivación de dicha correspondencia se gestionaba mediante cuadernos de registro manuscritos, hojas de control físico y carpetas encuadernadas trasladadas entre despachos por personal de mensajería. Este esquema tradicional ocasionaba demoras críticas, duplicidad de esfuerzos, carencia de métricas operativas sobre los tiempos de respuesta y una alta vulnerabilidad ante el extravío temporal o definitivo de expedientes de relevancia legislativa, lo cual justificó la necesidad de modernización técnica e institucional.",
    { indent: true }
  ),

  h3("1.1.2. Datos generales (ubicación y rubros)"),
  p(
    "A continuación, se consignan los datos institucionales generales correspondientes a la entidad receptora:",
    { indent: true }
  ),
  bullet("Dirección institucional", "[Información no especificada / Completar por el estudiante]"),
  bullet("Ciudad y País", "Sucre - Bolivia"),
  bullet("Rubro principal", "Administración pública / Gestión legislativa y fiscalizadora municipal"),
  bullet("Rubro secundario", "Desarrollo tecnológico, gobernanza electrónica e innovación gubernamental"),
  bullet("Teléfono de contacto", "[Información no especificada / Completar por el estudiante]"),
  bullet("Correo electrónico institucional", "[Información no especificada / Completar por el estudiante]"),
  bullet("Portal web oficial", "[Información no especificada / Completar por el estudiante]"),

  h3("1.1.3. Misión y Visión (valores)"),
  p(
    "La orientación estratégica y axiológica del Concejo Municipal de Sucre se fundamenta en los siguientes preceptos institucionales:",
    { indent: true }
  ),
  bullet("Misión institucional", "Ejercer con soberanía, probidad e independencia las facultades legislativas, deliberativas y fiscalizadoras en la jurisdicción municipal de Sucre, canalizando de forma oportuna las demandas y aspiraciones de la ciudadanía para consolidar un desarrollo social, urbano y económico inclusivo y sostenible."),
  bullet("Visión institucional", "Consolidarse como un órgano legislativo municipal modelo a nivel departamental y nacional, vanguardista en el uso de tecnologías de la información y comunicación, que promueva una gobernanza transparente, una gestión documental sin burocracia basada en papel y una interacción abierta y transparente con la sociedad civil."),
  bullet("Valores institucionales", "Transparencia activa, probidad pública, legalidad, ética en la función pública, responsabilidad social, equidad democrática, eficiencia operativa y vocación de servicio al ciudadano."),

  h3("1.1.4. Organigrama institucional"),
  p(
    "La configuración jerárquica y operativa del Concejo Municipal de Sucre responde a una estructura colegiada deliberante articulada bajo directrices de coordinación transversal. En el vértice superior se sitúa el Pleno del Concejo Municipal, máxima autoridad resolutiva compuesta por la totalidad de concejales munícipes. Bajo su dependencia inmediata opera la Directiva del Concejo, integrada por la Presidencia, Vicepresidencia y la Secretaría General del Concejo.",
    { indent: true }
  ),
  p(
    "El trabajo especializado de análisis técnico-jurídico y dictamen de proyectos se distribuye entre las Comisiones Permanentes, entre las cuales destacan la Comisión de Obras Públicas, Urbanismo y Servicios Básicos; la Comisión Social, Género, Generacional y Seguridad Ciudadana; la Comisión Económica, Financiera y Administrativa; la Comisión de Medio Ambiente, Salubridad y Recursos Naturales; y la Comisión Autonómica, Legislativa y de Cooperación. Asimismo, opera la Asesoría General y Asesoría del Pleno como instancias de soporte normativo directo.",
    { indent: true }
  ),
  p(
    "En la dimensión administrativa y de apoyo logístico se encuentra la Secretaría Administrativa y la Secretaría Auxiliar Administrativa, de las cuales dependen las unidades operativas de soporte: Unidad de Sistemas e Informática (Cómputo), Unidad de Comunicación y Prensa, Unidad de Contabilidad, Unidad de Recursos Humanos, Unidad de Activos Fijos, Unidad de Almacenes, Unidad de Archivos y Gaceta Municipal, el personal de Mensajería y Distribución Física, y la Ventanilla Única de Correspondencia y Trámites.",
    { indent: true }
  ),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    spacing: { before: 240, after: 240 },
    children: [
      new TextRun({
        text: "[ESPACIO RESERVADO PARA LA REPRESENTACIÓN GRÁFICA / ORGANIGRAMA INSTITUCIONAL OFICIAL DEL CONCEJO MUNICIPAL DE SUCRE]",
        font: FONT_NAME,
        size: FONT_SIZE_SMALL,
        bold: true,
        italics: true,
        color: "444444"
      })
    ]
  }),

  h3("1.1.5. Productos y servicios (Funciones)"),
  p(
    "El Concejo Municipal genera diversos instrumentos de carácter jurídico, resolutivo y fiscalizador, además de prestar servicios directos a la colectividad chuquisaqueña:",
    { indent: true }
  ),
  bullet("Productos principales", "Leyes Municipales, Resoluciones del Concejo Municipal, Minutas de Comunicación emitidas hacia el Órgano Ejecutivo, Peticiones de Informe Escrito (PIE), Peticiones de Informe Oral (PIO), Hojas de Ruta Institucionales (CM, CDE1, CDE2, CDH1) e Informes Técnico-Legales de Comisión."),
  bullet("Servicios ofrecidos", "Recepción y radicación centralizada de correspondencia externa en Ventanilla Única, tramitación de solicitudes de juntas vecinales y organizaciones civiles, celebración de audiencias públicas y sesiones de honor, publicación de normas en la Gaceta Municipal y atención de consultas ciudadanas sobre el estado de expedientes."),
  bullet("Funciones relevantes", "Fiscalización y auditoría del uso de recursos públicos por el Ejecutivo Municipal, aprobación y ratificación de convenios y contratos interinstitucionales, tratamiento y sanción de presupuestos operativos anuales (POA), y otorgación de condecoraciones y méritos cívicos."),

  h2("1.2. CONTEXTO ESPECÍFICO"),
  h3("1.2.1. Unidad de trabajo asignada"),
  p(
    "La Práctica Laboral se llevó a cabo en la Unidad de Sistemas e Informática (Unidad de Cómputo) del Concejo Municipal de Sucre, unidad técnica responsable de planificar, administrar, salvaguardar y modernizar la infraestructura de telecomunicaciones, servidores y plataformas informáticas de la entidad. Las actividades se desarrollaron en estrecha coordinación funcional con la Secretaría General del Concejo, la Secretaría Administrativa y los operadores de Ventanilla Única.",
    { indent: true }
  ),

  h3("1.2.2. Estructura organizacional de la unidad"),
  p(
    "La Unidad de Sistemas e Informática se encuentra adscrita orgánicamente a la Secretaría Administrativa del Concejo Municipal de Sucre. Su esquema operativo interno está constituido por la Jefatura de la Unidad de Cómputo/TI, el Área de Desarrollo e Ingeniería de Software, el Área de Redes, Telecomunicaciones y Servidores, y el Área de Mantenimiento y Soporte Técnico al Usuario. El estudiante practicante se incorporó directamente al Área de Desarrollo de Software, asumiendo la responsabilidad integral de análisis, diseño, reingeniería e implementación del nuevo sistema de gestión documental.",
    { indent: true }
  ),

  h3("1.2.3. Misión y Visión de la Unidad"),
  bullet("Misión de la Unidad", "Proveer, administrar e innovar soluciones tecnológicas de alta confiabilidad, seguridad y escalabilidad para respaldar la labor legislativa, optimizar la gestión documental municipal y garantizar la custodia de los activos digitales institucionales."),
  bullet("Visión de la Unidad", "Consolidarse como una unidad tecnológica ágil y moderna, catalizadora de la gobernanza digital dentro del Concejo Municipal de Sucre, orientada a la erradicación del papel físico y al aseguramiento de la transparencia en favor de la sociedad."),
  bullet("Valores de la Unidad", "Rigor metodológico, innovación continua, ética profesional, confidencialidad en el tratamiento de datos y calidad de servicio al usuario interno y externo."),

  h3("1.2.4. Responsabilidades de la unidad"),
  p(
    "La Unidad de Sistemas tiene a su cargo el soporte técnico y preventivo del parque informático institucional, la salvaguarda de bases de datos relacionales institucionales en Microsoft SQL Server, la administración de la red cableada e inalámbrica interna, la configuración de políticas de seguridad lógica y perimetral, la capacitación tecnológica al personal administrativo y técnico de comisiones, y el desarrollo de aplicaciones web a la medida de los procedimientos legislativos del Concejo Municipal.",
    { indent: true }
  ),

  h3("1.2.5. Cargo y funciones desempeñadas"),
  p(
    "El estudiante asumió el rol de Estudiante en Práctica Laboral / Desarrollador e Ingeniero de Software, desempeñándose durante el período oficial comprendido entre el 01 de Septiembre y el 19 de Noviembre de 2026. Sus funciones abarcaron el ciclo de vida completo de desarrollo de software:",
    { indent: true }
  ),
  bullet("Ingeniería inversa y análisis", "Extracción y sistematización de requerimientos funcionales a partir de manuales legados en formato PDF y código fuente preexistente del sistema Wayka."),
  bullet("Modelado de datos", "Diseño relacional en Microsoft SQL Server 2022/2025, integrando las tablas de correspondencia y funcionarios institucionales (TUnidad, TCargo, TEmpleados)."),
  bullet("Construcción del backend", "Implementación de una API RESTful en ASP.NET Core (.NET 8 LTS) y migración completa de la lógica transaccional a Stored Procedures en T-SQL."),
  bullet("Construcción del frontend", "Desarrollo de una Single Page Application (SPA) reactiva con React 19, Vite y Lucide Icons, alineada visualmente a la Gaceta Municipal de Sucre."),
  bullet("Seguridad y aseguramiento de calidad", "Implementación de suites de pruebas E2E con Playwright y ejecución de auditoría de seguridad y hardening de la base de datos."),

  h3("1.2.6. Manual operativo de funciones (MOF)"),
  p(
    "El perfil y catálogo de funciones operativas asignadas al estudiante se estructuró conforme al siguiente detalle formal:",
    { indent: true }
  ),
  bullet("Denominación del puesto", "Desarrollador de Software / Practicante de Ingeniería de Sistemas."),
  bullet("Dependencia directa", "Jefe de la Unidad de Sistemas e Informática / Tutor Institucional del Concejo Municipal."),
  bullet("Finalidad del cargo", "Diseñar, programar, estabilizar e integrar el Sistema de Gestión Documental y Trámites (Wayka MVP) en el ecosistema informático institucional del Concejo Municipal de Sucre."),
  bullet("Obligaciones y tareas", "Modelar esquemas de persistencia relacional; codificar servicios y controladores Web API; implementar interfaces de usuario accesibles; redactar procedimientos almacenados transaccionales; elaborar pruebas funcionales de regresión; y documentar técnicamente la arquitectura de software."),
  bullet("Límites de autoridad y custodia", "Custodia estricta del código fuente, repositorios git y esquemas relacionales; prohibición expresa de divulgación de datos personales sensibles (PII) de ciudadanos o funcionarios; y apego estricto a las normas de seguridad del Concejo."),
  bullet("Recursos técnicos asignados", "Estación de trabajo de cómputo dedicada, acceso al servidor local Docker con Microsoft SQL Server 2022/2025, herramientas de desarrollo Visual Studio Code, .NET 8 SDK y entorno Node.js."),
  new Paragraph({ children: [new PageBreak()] })
);

// ==============================================================================
// 2. OBJETIVOS
// ==============================================================================
docElements.push(
  h1("2. OBJETIVOS"),
  h2("2.1. OBJETIVO GENERAL"),
  p(
    "Desarrollar e implementar el Sistema de Gestión Documental y Workflow Institucional (Sistema Wayka) para el Concejo Municipal de Sucre, aplicando ingeniería inversa sobre manuales y sistemas legados, una arquitectura en capas desacoplada con ASP.NET Core 8, React 19 y Microsoft SQL Server, para automatizar el registro, la derivación, el control de plazos normativos en comisiones y la consulta ciudadana transparente de expedientes.",
    { indent: true }
  ),
  h2("2.2. OBJETIVOS ESPECÍFICOS"),
  p(
    "Para garantizar la consecución del objetivo general, se definieron cuatro objetivos específicos constructivos, medibles y desprovistos de formulaciones rutinarias:",
    { indent: true }
  ),
  bullet("Objetivo Específico 1", "Realizar el análisis de requerimientos e ingeniería inversa a partir de los cuatro manuales del sistema legado Wayka y catálogos preexistentes, delimitando el alcance del Producto Mínimo Viable (MVP) y consolidando el modelo relacional unificado en Microsoft SQL Server bajo directrices de integridad referencial."),
  bullet("Objetivo Específico 2", "Implementar un subsistema robusto de autenticación criptográfica basado en JSON Web Tokens (JWT) con control de acceso basado en roles (RBAC) y reestructurar la capa de persistencia mediante procedimientos almacenados fuertemente tipados en T-SQL, desacoplando la lógica transaccional de consultas directas."),
  bullet("Objetivo Específico 3", "Construir el motor de workflow institucional y ciclo de vida documental, modelando la macro-bifurcación en Ventanilla Única, la sub-asignación interna en Comisiones Permanentes con semaforización de plazos normativos (5 a 15 días hábiles), la proyección de los cinco instrumentos legislativos salientes (PIE, PIO, Minuta, Resolución y Nota Externa) y el circuito plenario con firmas duales."),
  bullet("Objetivo Específico 4", "Desarrollar la interfaz gráfica de usuario reactiva (SPA) orientada a la usabilidad y la estética visual de la Gaceta Municipal de Sucre, incorporando la generación automatizada de la Hoja de Ruta oficial imprimible, el portal de consulta pública ciudadana y una suite de pruebas automatizadas End-to-End (E2E) con Playwright para certificar la estabilidad operativa."),
  new Paragraph({ children: [new PageBreak()] })
);

// ==============================================================================
// 3. DESARROLLO
// ==============================================================================
docElements.push(
  h1("3. DESARROLLO"),
  h2("3.1. GENERALIDADES DE TRABAJO"),
  p(
    "El desarrollo de la práctica laboral requirió una articulación rigurosa entre las exigencias académicas de la Facultad de Tecnología y los requerimientos funcionales y normativos propios de la administración pública municipal. A continuación, se detallan las condiciones operativas y metodológicas aplicadas:",
    { indent: true }
  ),
  pRuns([
    { text: "Condiciones de trabajo e infraestructura: ", bold: true },
    { text: "Las labores técnicas se llevaron a cabo utilizando una estación de trabajo de alta gama equipada con procesador multi-núcleo de 64 bits, 16 GB de memoria RAM y almacenamiento en estado sólido NVMe, operando bajo el sistema operativo GNU/Linux. En cuanto al ecosistema de software, se empleó Docker Engine (v24+) y Docker Compose para orquestar la imagen oficial de Microsoft SQL Server 2022 sobre Linux (base institucional DB_TRAMITES_EXTERNOS). El entorno de desarrollo integró el SDK de .NET 8 LTS (C#), Node.js (v20/v24), el bundler Vite 5, React 19, Git para control de versiones distribuido, DBeaver Community como cliente SQL y Playwright Test Runner para automatización de pruebas." }
  ]),
  pRuns([
    { text: "Modalidad de trabajo: ", bold: true },
    { text: "Se adoptó una modalidad mixta con predominancia presencial. Las sesiones presenciales se destinaron al levantamiento de información en Ventanilla Única, reuniones de alineación técnica con personal de Secretaría General, validación de flujos de comisiones con asesores y pruebas directas de compatibilidad en la red del Concejo Municipal. La modalidad remota se utilizó para la codificación intensiva de controladores, optimización de algoritmos de migración, refinamiento de estilos y ejecución de pruebas de carga." }
  ]),
  pRuns([
    { text: "Detalle de horarios y jornada laboral: ", bold: true },
    { text: "La jornada laboral de práctica se estructuró en régimen continuo diurno formal de ocho horas de lunes a viernes, distribuido en dos turnos: turno de la mañana de 08:00 a 12:00 y turno de la tarde de 14:00 a 18:00, dando cumplimiento estricto a la carga horaria estipulada para la asignatura SHC170." }
  ]),
  pRuns([
    { text: "Planificación de actividades (Matriz de Priorización): ", bold: true },
    { text: "Para asegurar el avance estructurado del proyecto en un periodo de tres meses y bajo el rol de desarrollador individual, se implementó una Matriz de Eisenhower adaptada a la ingeniería de software:" }
  ]),
  bullet("Importante y Urgente", "Estabilización del esquema relacional DDL; migración de la base de datos a SQL Server; refactorización de consultas directas hacia Stored Procedures (SPs); resolución de bloqueos en la asignación de correlativos anuales; y soporte a la bifurcación obligatoria de Ventanilla Única."),
  bullet("Importante pero No Urgente", "Construcción de la suite de pruebas End-to-End con Playwright; auditoría de ciberseguridad y hardening de bases de datos; diseño modular de la Hoja de Ruta imprimible; y optimización de filtros en el Escritorio Virtual."),
  bullet("Urgente pero No Importante", "Ajustes cosméticos menores en componentes CSS; adecuación visual de etiquetas y badges en tablas administrativas; y atención a consultas informativas del personal operativo."),
  bullet("Rutinarias y de Mantenimiento", "Respaldos diarios de la base de datos contenerizada; ejecución de linters de código; commits convencionales en git; y redacción periódica de bitácoras técnicas."),

  h2("3.2. DETALLE DE FUNCIONES REALIZADAS"),
  p(
    "Durante el periodo de práctica laboral, el estudiante asumió seis funciones técnicas sustantivas, desarrolladas de forma exhaustiva y secuencial:",
    { indent: true }
  ),
  pRuns([
    { text: "Función 1: Lectura, digitalización OCR e ingeniería inversa de la documentación del sistema legado Wayka. ", bold: true },
    { text: "Esta función consistió en el estudio profundo y la extracción automatizada de texto sobre cuatro manuales funcionales legados: Administrador de Sistemas, Administrador de Wayka, Diseñador de Flujos y Encargado de Ventanilla Única. Debido a que la documentación histórica se encontraba escaneada en formato PDF sin capa de texto seleccionable, se implementaron scripts en Python utilizando bibliotecas de reconocimiento óptico de caracteres (OCR) y expresiones regulares para digitalizar, segmentar y limpiar el texto. A partir de dicho corpus, se sintetizó una matriz de especificación de requerimientos de software (SRS) compuesta por 13 requerimientos funcionales mayores, identificando los flujos indispensables para el MVP y separando los módulos dinámicos descartados para fases posteriores (tales como el diseñador gráfico de flujos y generadores genéricos de formularios)." }
  ]),
  pRuns([
    { text: "Función 2: Diseño y consolidación del modelo de base de datos relacional y unificación de catálogos institucionales. ", bold: true },
    { text: "Comprendió el modelado conceptual, lógico y físico del esquema de base de datos en Microsoft SQL Server 2022, asegurando la coexistencia armónica del modelo transaccional de trámites con las tablas preexistentes del Concejo Municipal (`DB_TRAMITES_EXTERNOS`). Se diseñó la estructura para personas, usuarios, roles, ubicaciones orgánicas, trámites, movimientos históricos y adjuntos. Posteriormente, se efectuó la integración con las tablas de personal municipal (`TUnidad`, `TCargo` y `TEmpleados`), implementando un mecanismo de sincronización bidireccional y autocompletado en cascada para garantizar que todo usuario del sistema esté vinculado inequívocamente con un funcionario acreditado en el escalafón del Concejo." }
  ]),
  pRuns([
    { text: "Función 3: Reingeniería del backend hacia ASP.NET Core (.NET 8 LTS) y migración integral a procedimientos almacenados. ", bold: true },
    { text: "En concordancia con el estándar corporativo adoptado por la institución receptora, se ejecutó la reingeniería completa de la API REST, migrando el prototipo inicial desde Node.js/Express hacia ASP.NET Core Web API en C# bajo el framework .NET 8 LTS. Se estructuró un patrón N-Tier desacoplado compuesto por controladores delgados, Data Transfer Objects (DTOs), servicios de negocio e interfaces fuertemente tipadas. Como hito de ingeniería de alto impacto, se erradicaron las consultas SQL en línea y el mapeo directo de Entity Framework mediante la creación del servicio centralizado `StoredProcedureService`, canalizando el 100% de las operaciones de lectura y modificación a través de más de 30 procedimientos almacenados (`usp_*`) transaccionales en T-SQL, reduciendo la vulnerabilidad a inyecciones SQL y optimizando los planes de ejecución en el motor." }
  ]),
  pRuns([
    { text: "Función 4: Modelado e implementación del flujo operativo y legislativo del Concejo Municipal de Sucre. ", bold: true },
    { text: "Esta función constituyó el núcleo de adaptación institucional del software, incorporando los procedimientos contemplados en el Reglamento General del Concejo. Se diseñó la macro-bifurcación en Ventanilla Única, canalizando las notas externas hacia la Presidencia del Concejo y las notas internas a Secretaría Administrativa. Para el ciclo técnico de comisiones, se programó la sub-asignación interna de concejales hacia asesores, integrando el cálculo dinámico del plazo normativo de informe técnico-jurídico (de 5 a 15 días hábiles) con semaforización visual de vencimiento. Asimismo, se incorporó la proyección y persistencia de los cinco instrumentos legislativos oficiales (Petición de Informe Escrito - PIE, Petición de Informe Oral - PIO, Minuta de Comunicación, Resolución Municipal y Nota Externa), culminando en el circuito de aprobación en Pleno y despacho final con validación de firmas duales concurrentes (Presidencia y Secretaría General)." }
  ]),
  pRuns([
    { text: "Función 5: Diseño y construcción de la interfaz gráfica de usuario en React con identidad institucional. ", bold: true },
    { text: "Se desarrolló una Single Page Application (SPA) basada en React 19 y Vite, implementando un sistema de diseño institucional inspirado en la Gaceta Municipal de Sucre. Dicho sistema adoptó una paleta sobria basada en rojo borgoña (#800000), azul institucional (#1B365D) y fondos neutros accesibles. Se programaron componentes modulares para Ventanilla Única, Escritorio Virtual de funcionarios con bandejas segregadas (Pendientes, Recibidos, Despachados), paneles de administración para supervisores y el portal público de búsqueda ciudadana de trámites. Además, se desarrolló la vista y plantilla HTML/CSS para la generación oficial e impresión de la Hoja de Ruta institucional, reflejando el código correlativo anual, datos del remitente, detalle histórico de proveídos y el código de barras/QR de verificación." }
  ]),
  pRuns([
    { text: "Función 6: Implementación de pruebas automatizadas E2E y auditoría de ciberseguridad sobre la base de datos. ", bold: true },
    { text: "Con el objetivo de garantizar la resiliencia y estabilidad del sistema, se configuró el framework Playwright para ejecutar pruebas automatizadas de extremo a extremo (E2E), reproduciendo el circuito completo: radicación en Ventanilla Única → asignación en Presidencia → tratamiento en Comisión con plazo normativo → generación de Minuta/PIE → aprobación en Pleno → despacho final. En paralelo, se ejecutó una exhaustiva auditoría de seguridad sobre la instancia de SQL Server 2022 y la API REST, diagnosticando 12 vectores de riesgo (almacenamiento de contraseñas, uso de cuenta sa, políticas de cifrado TLS) y documentando formalmente las directrices técnicas de mitigación y hardening perimetral." }
  ]),

  h2("3.3. CRONOGRAMA DE TRABAJO"),
  p(
    "El cronograma de ejecución de la práctica laboral abarcó un horizonte temporal de 12 semanas hábiles, organizado en seis Sprints consecutivos de dos semanas cada uno, de acuerdo con la planificación expuesta en la Tabla 1:",
    { indent: true }
  ),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: { before: 180, after: 60 },
    children: [
      new TextRun({ text: "Tabla 1", font: FONT_NAME, size: FONT_SIZE_BODY, bold: true })
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({ text: "Cronograma de Ejecución por Sprints del Sistema Wayka", font: FONT_NAME, size: FONT_SIZE_BODY, italics: true })
    ]
  }),
  tableAPA(
    ["Sprint / Fase", "Periodo", "Funciones", "Actividades Principales y Entregables", "Estado"],
    [
      ["Sprint 1\nFundación", "01 Sep – 14 Sep\n(Semanas 1 y 2)", "F1, F2", "Análisis OCR de manuales; modelo relacional base; contenedor Docker SQL Server 2022; autenticación JWT y roles RBAC.", "Completado\n(100%)"],
      ["Sprint 2\nCore y Catálogos", "15 Sep – 28 Sep\n(Semanas 3 y 4)", "F2, F3", "Integración tablas institucionales (TUnidad, TCargo, TEmpleados); radicación Ventanilla Única; migración backend a .NET 8.", "Completado\n(100%)"],
      ["Sprint 3\nWorkflow CMS", "29 Sep – 12 Oct\n(Semanas 5 y 6)", "F3, F4", "Bandejas en Escritorio Virtual; derivación libre; retroceso con justificación; timeline histórico de trazabilidad transaccional.", "Completado\n(100%)"],
      ["Adenda Post-S3\nFlujos Oficiales", "05 Oct – 24 Oct\n(Semanas 6 y 7)", "F4, F6", "Macro-bifurcación; flujo comisiones (5-15 días); 5 instrumentos (PIE, PIO, etc.); circuito Plenario con firmas duales; pruebas E2E.", "Completado\n(100%)"],
      ["Sprint 4\nAdministración", "13 Oct – 26 Oct\n(Semanas 7 y 8)", "F4, F5", "Bloqueo/desbloqueo de trámites; anulación justificada; reactivación de procesos concluidos; generación Hoja de Ruta oficial.", "Completado\n(100%)"],
      ["Sprint 5\nTransparencia", "27 Oct – 09 Nov\n(Semanas 9 y 10)", "F5, F6", "Búsqueda pública ciudadana por Hoja de Ruta; reporte de pendientes por funcionario; hardening de seguridad en base de datos.", "Completado\n(100%)"],
      ["Sprint 6\nCierre y Pruebas", "10 Nov – 19 Nov\n(Semanas 11 y 12)", "F5, F6", "Pruebas de regresión final; depuración de bugs; auditoría final de despliegue; entrega de documentación técnica formal.", "Completado\n(100%)"]
    ],
    [1600, 1600, 1000, 4200, 1400]
  ),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: { before: 60, after: 240 },
    children: [
      new TextRun({ text: "Nota. ", font: FONT_NAME, size: FONT_SIZE_SMALL, italics: true }),
      new TextRun({ text: "El cronograma contempla las seis fases operativas del proyecto durante las 12 semanas de duración de la práctica laboral SHC170. Fuente: Elaboración propia.", font: FONT_NAME, size: FONT_SIZE_SMALL })
    ]
  }),

  h2("3.4. DESARROLLO DE ACTIVIDADES"),
  p(
    "A continuación, se desarrolla detalladamente cada una de las actividades técnicas vinculadas de manera directa a los cuatro Objetivos Específicos planteados para el proyecto:",
    { indent: true }
  ),

  // Actividad 1
  h3("3.4.1. Actividad 1: Ingeniería inversa de manuales legados, análisis de requerimientos y modelado relacional inicial"),
  pRuns([
    { text: "1. Descripción: ", bold: true },
    { text: "La actividad inicial se concentró en desentrañar las reglas de negocio y los flujos documentales que gobernaron históricamente el sistema Wayka en la administración municipal. Debido a la carencia de documentación viva o esquemas conceptuales actualizados, fue imperativo someter los manuales escaneados a un proceso de digitalización y análisis heurístico para derivar especificaciones formales de ingeniería de software." }
  ]),
  p(
    "A partir de este análisis, se redactó el documento maestro de especificación de requerimientos de software (SRS), acotando con precisión quirúrgica el alcance del Producto Mínimo Viable (MVP). Se catalogaron los módulos críticos requeridos (autenticación, ventanilla única, derivación directa y trazabilidad), al tiempo que se formalizaron las exclusiones estratégicas para una segunda fase institucional (como el motor gráfico de formularios dinámicos y diseñadores drag-and-drop).",
    { indent: true }
  ),
  p(
    "Con la especificación validada, se formuló el primer diseño conceptual de entidad-relación, plasmando las entidades troncales necesarias para gobernar las personas, los usuarios del sistema, la jerarquía de dependencias y el registro de correspondencias oficiales.",
    { indent: true }
  ),
  pRuns([
    { text: "2. Objetivo: ", bold: true },
    { text: "Formalizar la matriz de requerimientos del sistema Wayka MVP y definir el modelo conceptual de datos preliminar mediante la ingeniería inversa de los manuales funcionales legados." }
  ]),
  pRuns([
    { text: "3. Desarrollo: ", bold: true },
    { text: "Para la ejecución de esta actividad se destinaron dos semanas continuas. Se utilizaron scripts en Python apoyados en la herramienta Tesseract OCR para el procesamiento digital de imágenes y extracción de texto desde los archivos PDF originales. La sistematización de entidades y casos de uso se modeló en notación UML utilizando diagramadores de arquitectura. Los procedimientos incluyeron la depuración de redundancias léxicas en los textos legados y el establecimiento del diagrama de contexto institucional." }
  ]),
  ...figureAPA("1.1", "Diagrama de Contexto y Flujo General de Trámites Wayka", "Ventanilla Única ---> [Ingreso Trámite] ---> [Asignación Despacho / Comisión] ---> [Escritorio Virtual / Derivación] ---> [Despacho Final / Archivo]", "Ilustra el límite perimetral del sistema y la interacción entre ciudadanos, ventanilla única y despachos."),
  pRuns([
    { text: "4. Período de tiempo: ", bold: true },
    { text: "01 de Septiembre al 14 de Septiembre de 2026 (Duración: 2 semanas)." }
  ]),
  pRuns([
    { text: "5. Resultados: ", bold: true },
    { text: "Matriz SRS con 13 requerimientos funcionales mayores aprobados; delimitación formal del alcance del MVP; y diagrama entidad-relación preliminar consolidado." }
  ]),

  // Actividad 2
  h3("3.4.2. Actividad 2: Integración de catálogos institucionales del Concejo Municipal y migración a Microsoft SQL Server"),
  pRuns([
    { text: "1. Descripción: ", bold: true },
    { text: "El Concejo Municipal de Sucre contaba con una base de datos institucional preexistente denominada DB_TRAMITES_EXTERNOS, que albergaba el registro oficial de unidades organizacionales, puestos jerárquicos y la nómina de funcionarios públicos. Para que el nuevo sistema Wayka fuera funcional y aceptado institucionalmente, resultaba mandatorio sincronizar su persistencia con dichos catálogos en lugar de mantener registros aislados." }
  ]),
  p(
    "El estudiante procedió al diseño de scripts de migración DDL en dialecto T-SQL, configurando los objetos de base de datos en un contenedor Docker con Microsoft SQL Server 2022. Se crearon las tablas institucionales TUnidad, TCargo y TEmpleados, estableciendo restricciones de clave foránea e integridad referencial estricta hacia el esquema de usuarios y personas del sistema.",
    { indent: true }
  ),
  p(
    "Asimismo, se crearon los disparadores y mecanismos de sincronización necesarios para que la actualización o desactivación de un funcionario en la base corporativa del Concejo se reflejara de manera inmediata en la autenticación y permisos del sistema Wayka.",
    { indent: true }
  ),
  pRuns([
    { text: "2. Objetivo: ", bold: true },
    { text: "Unificar el modelo de persistencia del sistema Wayka en Microsoft SQL Server 2022, integrando las tablas maestras institucionales de personal y estructura orgánica del Concejo Municipal." }
  ]),
  pRuns([
    { text: "3. Desarrollo: ", bold: true },
    { text: "La actividad demandó dos semanas de labor técnica intensiva. Se utilizaron entornos Docker Compose para levantar el motor de base de datos en Linux, DBeaver para la gestión visual del catálogo relacional y scripts SQL versionados cronológicamente (001 a 012). Se ejecutaron procedimientos de normalización en tercera forma normal (3FN) y validaciones de unicidad sobre documentos de identidad (CI) de los servidores públicos." }
  ]),
  ...figureAPA("1.2", "Diagrama Entidad-Relación Consolidado del Sistema Wayka y Tablas Institucionales", "dbo.personas <--- dbo.TEmpleados <--- dbo.TCargo ---> dbo.TUnidad ---> dbo.ubicaciones_org ---> dbo.tramites ---> dbo.movimientos", "Muestra la integración relacional entre el núcleo transaccional de trámites y las tablas de personal del Concejo."),
  pRuns([
    { text: "4. Período de tiempo: ", bold: true },
    { text: "15 de Septiembre al 28 de Septiembre de 2026 (Duración: 2 semanas)." }
  ]),
  pRuns([
    { text: "5. Resultados: ", bold: true },
    { text: "Esquema relacional unificado en Microsoft SQL Server 2022; integración operativa de TUnidad, TCargo y TEmpleados; y contenedor Docker oficial desplegado y probado." }
  ]),

  // Actividad 3
  h3("3.4.3. Actividad 3: Construcción de la arquitectura de seguridad JWT, RBAC y reingeniería a ASP.NET Core con Stored Procedures"),
  pRuns([
    { text: "1. Descripción: ", bold: true },
    { text: "Para cumplir con las directrices de estandarización tecnológica de la institución, se realizó una reingeniería completa del backend, transitando del prototipo inicial hacia ASP.NET Core (.NET 8 LTS) en lenguaje C#. Se estructuró un patrón arquitectónico N-Tier desacoplado con separación rigurosa entre controladores Web API, capas de servicio y componentes de acceso a datos." }
  ]),
  p(
    "Se diseñó el subsistema de seguridad fundamentado en tokens JSON Web Token (JWT) con firma criptográfica HMAC-SHA256, soportando una matriz de autorización basada en roles (RBAC) para los perfiles del sistema: Administrador del Sistema, Administrador de Wayka, Ventanilla Única y Funcionario Institucional.",
    { indent: true }
  ),
  p(
    "En una fase posterior de optimización y hardening, se eliminaron las sentencias SQL embebidas en el código mediante la programación del servicio centralizado IStoredProcedureService. A través de este servicio, todas las operaciones de inserción, actualización, derivación y consulta se derivaron a más de 30 procedimientos almacenados fuertemente tipados en T-SQL, garantizando la atomicidad de las transacciones documentales.",
    { indent: true }
  ),
  pRuns([
    { text: "2. Objetivo: ", bold: true },
    { text: "Desplegar un backend corporativo desacoplado en ASP.NET Core 8 dotado de autenticación JWT, autorización RBAC y acceso a datos gobernado por Stored Procedures en SQL Server." }
  ]),
  pRuns([
    { text: "3. Desarrollo: ", bold: true },
    { text: "La ejecución se extendió a lo largo de tres semanas de trabajo continuo. Se empleó el SDK oficial de .NET 8, paquetes Microsoft.Data.SqlClient, Entity Framework Core para la parametrización de tipos, y Swagger UI para la documentación de contratos REST. Los procedimientos almacenados incorporaron bloques de control transaccional (BEGIN TRANSACTION / COMMIT / ROLLBACK) y manejo robusto de excepciones estructuradas (TRY...CATCH)." }
  ]),
  ...figureAPA("1.3", "Arquitectura N-Tier Desacoplada del Backend ASP.NET Core con Stored Procedures", "[Cliente React] ---> [Middlewares / JWT Auth] ---> [Controllers] ---> [Services] ---> [StoredProcedureService] ---> [T-SQL Stored Procedures]", "Esquema de comunicación de capas garantizando el desacoplamiento y la seguridad transaccional en la base de datos."),
  pRuns([
    { text: "4. Período de tiempo: ", bold: true },
    { text: "20 de Septiembre al 08 de Octubre de 2026 (Duración: 3 semanas)." }
  ]),
  pRuns([
    { text: "5. Resultados: ", bold: true },
    { text: "Solución ASP.NET Core (.NET 8) compilando sin advertencias; catálogo de más de 30 procedimientos almacenados en T-SQL; servicio de autenticación JWT operativo; y documentación Swagger interactiva disponible." }
  ]),

  // Actividad 4
  h3("3.4.4. Actividad 4: Implementación del motor de workflow institucional, macro-bifurcación, comisiones y circuito plenario"),
  pRuns([
    { text: "1. Descripción: ", bold: true },
    { text: "Esta actividad constituyó el núcleo funcional de mayor complejidad técnica y legal del proyecto, al requerir la traducción computacional de los procesos parlamentarios establecidos en el Reglamento General del Concejo Municipal de Sucre. Se modeló la macro-bifurcación en Ventanilla Única, direccionando de forma automática las notas externas hacia la Presidencia del Concejo y las notas internas a la Secretaría Administrativa." }
  ]),
  p(
    "Para el flujo interno de las Comisiones Permanentes, se implementó la sub-asignación interna de expedientes desde el Presidente de Comisión (Concejal) hacia el Asesor Técnico-Jurídico responsable. Se introdujo un algoritmo de cálculo dinámico para el plazo reglamentario de informe (5, 10 o 15 días hábiles), generando alertas semaforizadas en tiempo real sobre el vencimiento del SLA en el Escritorio Virtual.",
    { indent: true }
  ),
  p(
    "Finalmente, se incorporó la generación y registro formal de los cinco instrumentos legislativos resultantes del Concejo: Petición de Informe Escrito (PIE), Petición de Informe Oral (PIO), Minuta de Comunicación, Resolución Municipal y Nota Externa de Contestación, culminando en la fase de deliberación plenaria y despacho final con validación de firmas duales concurrentes (Presidencia y Secretaría General).",
    { indent: true }
  ),
  pRuns([
    { text: "2. Objetivo: ", bold: true },
    { text: "Construir el motor de workflow del Concejo Municipal que automatice la macro-bifurcación de correspondencias, la gestión temporal de comisiones y el circuito legislativo de aprobación y firmas." }
  ]),
  pRuns([
    { text: "3. Desarrollo: ", bold: true },
    { text: "La actividad se ejecutó durante tres semanas. Se programaron los procedimientos almacenados específicos usp_Tramites_Derivar, usp_Tramites_MarcarAtendido y usp_Tramites_AprobarPleno. Se integró la biblioteca Lucide Icons en el frontend para representar los semáforos de SLA y se establecieron controles estrictos de precondición (como la exigencia obligatoria de adjuntos PDF para concluir informes de comisión)." }
  ]),
  ...figureAPA("1.4", "Diagrama de Secuencia del Circuito Legislativo y Comisiones en el Sistema Wayka", "Ventanilla Única ---> Presidencia CMS ---> Comisión (Plazo 5-15d) ---> Asesor (Genera PIE/Minuta) ---> Asesoría Pleno ---> Pleno CMS ---> Firmas Duales ---> Despacho", "Secuencia de interacción entre los actores institucionales y la persistencia de instrumentos legislativos."),
  pRuns([
    { text: "4. Período de tiempo: ", bold: true },
    { text: "05 de Octubre al 24 de Octubre de 2026 (Duración: 3 semanas)." }
  ]),
  pRuns([
    { text: "5. Resultados: ", bold: true },
    { text: "Motor de estados de trámites operativo; semaforización de SLA de 5 a 15 días hábiles implementada; selector de los 5 instrumentos normativos habilitado; y validación de firmas duales completada." }
  ]),

  // Actividad 5
  h3("3.4.5. Actividad 5: Desarrollo de interfaces de usuario (SPA React), generación de Hoja de Ruta oficial y portal ciudadano"),
  pRuns([
    { text: "1. Descripción: ", bold: true },
    { text: "Para proporcionar una experiencia de usuario eficiente, accesible y visualmente armónica con la imagen institucional del Concejo, se construyó el frontend en React 19 y Vite bajo una arquitectura Single Page Application (SPA). Se diseñó una biblioteca de estilos CSS/SCSS modular fundamentada en el manual de identidad de la Gaceta Municipal de Sucre, priorizando el rojo borgoña (#800000) y azul institucional (#1B365D)." }
  ]),
  p(
    "Se implementaron los módulos de interfaz gráfica correspondientes a la Ventanilla Única (con generación atómica de correlativos anuales CM-XX/2026), el Escritorio Virtual con sus bandejas de trabajo (Pendientes, Recibidos, Despachados) y el panel central de administración (AdminHub).",
    { indent: true }
  ),
  p(
    "Como componentes de alto valor añadido, se diseñó la plantilla oficial imprimible de la Hoja de Ruta Institucional (con visualización de historial de proveídos y metadatos del trámite) y el Portal Ciudadano de Consulta Pública en la página principal, permitiendo a cualquier habitante verificar el estado y ubicación de su trámite en tiempo real sin requerir credenciales de acceso.",
    { indent: true }
  ),
  pRuns([
    { text: "2. Objetivo: ", bold: true },
    { text: "Desarrollar una interfaz web interactiva, moderna y accesible para funcionarios y ciudadanos, incorporando la emisión formal de la Hoja de Ruta y el portal de transparencia municipal." }
  ]),
  pRuns([
    { text: "3. Desarrollo: ", bold: true },
    { text: "La actividad abarcó tres semanas continuas. Se utilizaron componentes funcionales de React con Hooks (useState, useEffect, useMemo), React Router v7 para el enrutamiento protegido por roles, y estilos de diseño responsivo adaptables a pantallas de escritorio y dispositivos móviles. La vista de impresión de la Hoja de Ruta se optimizó mediante reglas @media print para generar hojas normalizadas listas para archivadores físicos." }
  ]),
  ...figureAPA("1.5", "Mapa de Navegación y Vistas de Usuario del Frontend React", "Home (Búsqueda Pública) | Login ---> [Ventanilla Única | Escritorio Virtual | Hub Administrativo | Hoja de Ruta Imprimible]", "Estructura de páginas y jerarquía de navegación protegida según los roles del usuario institucional."),
  pRuns([
    { text: "4. Período de tiempo: ", bold: true },
    { text: "15 de Octubre al 04 de Noviembre de 2026 (Duración: 3 semanas)." }
  ]),
  pRuns([
    { text: "5. Resultados: ", bold: true },
    { text: "Frontend SPA React 19 totalmente integrado con la API REST; módulo de Ventanilla Única y Escritorio Virtual operativos; componente imprimible de Hoja de Ruta funcional; y buscador público por código anual desplegado." }
  ]),

  // Actividad 6
  h3("3.4.6. Actividad 6: Aseguramiento de la calidad con pruebas E2E en Playwright y auditoría de seguridad de base de datos"),
  pRuns([
    { text: "1. Descripción: ", bold: true },
    { text: "La fase de cierre y garantía de calidad técnica demandó la ejecución de pruebas automatizadas y un análisis exhaustivo de ciberseguridad sobre la infraestructura del sistema. Se estructuró un conjunto de pruebas End-to-End (E2E) con el framework Playwright, automatizando la navegación de navegadores headless para simular las interacciones de los distintos actores del Concejo." }
  ]),
  p(
    "Las pruebas validaron satisfactoriamente el ciclo institucional completo: inicio de sesión, creación de una correspondencia externa en Ventanilla Única, recepción en Presidencia, pase a la Comisión de Obras Públicas, sub-asignación al Asesor con plazo de 10 días, adjunción de informe PDF, conclusión con instrumento PIE, agendamiento en Asesoría del Pleno, deliberación plenaria y despacho final.",
    { indent: true }
  ),
  p(
    "En paralelo, se ejecutó una auditoría de seguridad sobre la base de datos Microsoft SQL Server 2022 y la API REST, diagnosticando 12 hallazgos clasificados por criticidad (almacenamiento de contraseñas, políticas de red y configuración TLS). Se elaboró el informe formal de auditoría y se definieron las acciones de remediación y hardening defensivo necesarias previas a la puesta en producción.",
    { indent: true }
  ),
  pRuns([
    { text: "2. Objetivo: ", bold: true },
    { text: "Verificar la integridad funcional del sistema mediante pruebas E2E automatizadas y evaluar la postura de seguridad de la base de datos para garantizar un despliegue seguro." }
  ]),
  pRuns([
    { text: "3. Desarrollo: ", bold: true },
    { text: "La actividad se ejecutó en tres semanas. Se programaron scripts de prueba en TypeScript/JavaScript para Playwright, ejecutando aserciones sobre estados DOM, tiempos de carga y códigos de respuesta HTTP. Para la auditoría de base de datos, se aplicaron consultas T-SQL sobre catálogos de sistema (sys.database_principals, sys.database_audit_specifications) y se generó una matriz de hallazgos con clasificación de riesgo de acuerdo al estándar CVSS." }
  ]),
  ...figureAPA("1.6", "Matriz de Pruebas Automatizadas y Evaluación de Ciberseguridad", "[Suites E2E Playwright: 100% Casos Aprobados] <---> [Auditoría Base de Datos: 12 Vectores Diagnosticados y Mitigados]", "Resumen del aseguramiento de calidad integral aplicado al software y la infraestructura relacional."),
  pRuns([
    { text: "4. Período de tiempo: ", bold: true },
    { text: "20 de Octubre al 15 de Noviembre de 2026 (Duración: 3 semanas)." }
  ]),
  pRuns([
    { text: "5. Resultados: ", bold: true },
    { text: "Suite E2E con Playwright validando el 100% de los flujos críticos sin regresiones; informe formal de auditoría de seguridad y hardening de base de datos entregado; y recomendaciones de remediación documentadas." }
  ]),
  new Paragraph({ children: [new PageBreak()] })
);

// ==============================================================================
// 4. CONCLUSIONES Y RESULTADOS
// ==============================================================================
docElements.push(
  h1("4. CONCLUSIONES Y RESULTADOS"),
  pRuns([
    { text: "PREÁMBULO GENERAL: ", bold: true },
    { text: "La realización de la práctica laboral en el Concejo Municipal de Sucre ha constituido un hito de trascendental importancia en la formación académica y profesional del estudiante de la carrera de Ingeniería de Sistemas / Ciencias de la Computación de la Universidad San Francisco Xavier de Chuquisaca. La inmersión directa en el entorno de la administración pública legislativa permitió contrastar los fundamentos teóricos adquiridos en las aulas universitarias —en materias como Ingeniería de Software, Bases de Datos Avanzadas, Arquitectura Web y Seguridad Informática— con los desafíos y restricciones operativas reales del sector público, tales como la coexistencia de modelos de datos legados, la cultura burocrática del papel físico y la necesidad ineludible de apego al marco reglamentario municipal." }
  ]),
  p(
    "Aspectos destacados de la experiencia:",
    { indent: true }
  ),
  bullet("Aplicación de conocimientos académicos", "Se demostró la solvencia para trasladar conceptos de ingeniería inversa, modelado relacional 3FN, arquitecturas desacopladas N-Tier y diseño de software orientado a componentes hacia una solución computacional de escala institucional que resuelve una problemática histórica de gestión municipal."),
  bullet("Desarrollo de competencias profesionales", "Se fortalecieron competencias de comunicación técnica interinstitucional, capacidad de síntesis ante requerimientos complejos expresados en manuales antiguos, autonomía resolutiva bajo el rol de desarrollador individual y rigor metodológico en el control de versiones distribuido y aseguramiento de calidad."),
  bullet("Cumplimiento integral de objetivos", "Se alcanzaron con éxito los hitos programados para la construcción del Sistema Wayka MVP, alcanzando un 100% de cumplimiento en los componentes de persistencia, lógica de negocio y presentación visual previstos en el plan de trabajo de doce semanas."),
  bullet("Aporte tangible a la institución", "El Concejo Municipal de Sucre dispone ahora de una plataforma tecnológica soberana, moderna y adaptada a su reglamento interno, capaz de registrar digitalmente las correspondencias ciudadanas, fiscalizar los plazos de dictamen en comisiones con alertas semafóricas, auditar la aprobación de instrumentos legislativos y brindar a la población un portal público de consulta para transparentar la gestión pública."),

  h2("CONCLUSIONES POR OBJETIVO ESPECÍFICO"),

  // Conclusión OE1
  h3("Conclusiones respecto al Objetivo Específico 1: Ingeniería inversa y modelado relacional"),
  bullet("Grado de cumplimiento", "100% (Completado en su totalidad según cronograma y especificaciones)."),
  bullet("Aporte realizado", "Estructuración de una especificación SRS formal con 13 requerimientos funcionales mayores y diseño de un esquema de base de datos relacional normalizado en Microsoft SQL Server 2022 que integró sin fisuras las tablas maestras institucionales de personal (TUnidad, TCargo, TEmpleados)."),
  bullet("Dificultades encontradas y superadas", "La baja calidad de legibilidad en los manuales escaneados en PDF demandó la implementación de filtros OCR avanzados en Python. Asimismo, las discrepancias estructurales entre la base de datos preexistente y el nuevo modelo se resolvieron mediante scripts de sincronización y normalización DDL."),
  bullet("Lecciones aprendidas", "La documentación de sistemas legados suele presentar vacíos e inconsistencias con la práctica operativa real, por lo que la ingeniería inversa sobre artefactos debe complementarse siempre con entrevistas de campo y validación con los usuarios finales."),
  bullet("Recomendaciones", "Se recomienda a la Unidad de Sistemas mantener actualizado un repositorio centralizado de diccionarios de datos y diagramas entidad-relación institucionales para evitar futuros esfuerzos de reingeniería ciega."),

  // Conclusión OE2
  h3("Conclusiones respecto al Objetivo Específico 2: Autenticación JWT, RBAC y Stored Procedures"),
  bullet("Grado de cumplimiento", "100% (Completado y validado en entorno de desarrollo e integración)."),
  bullet("Aporte realizado", "Construcción de un backend robusto en ASP.NET Core (.NET 8 LTS) dotado de seguridad basada en JWT con expiración controlada, autorización por roles (RBAC) y la migración total de las operaciones de datos hacia más de 30 procedimientos almacenados en T-SQL con control transaccional ACID."),
  bullet("Dificultades encontradas y superadas", "La refactorización de consultas directas de Entity Framework Core hacia Stored Procedures implicó rediseñar los modelos de DTOs y gestionar tipos de retorno complejos mediante SqlDataReader, superando errores de casteo y conexiones concurrentes."),
  bullet("Lecciones aprendidas", "El uso de procedimientos almacenados en T-SQL no solo optimiza sensiblemente el rendimiento de ejecución al precompilar planes de consulta, sino que constituye una barrera defensiva de primer nivel frente a vectores de inyección SQL en la capa de datos."),
  bullet("Recomendaciones", "Adoptar como estándar corporativo el uso obligatorio de Stored Procedures y parametrización estricta en todas las aplicaciones web futuras que interactúen con bases de datos del Concejo Municipal."),

  // Conclusión OE3
  h3("Conclusiones respecto al Objetivo Específico 3: Motor de Workflow, Comisiones y Circuito Plenario"),
  bullet("Grado de cumplimiento", "100% (Completamente adaptado y validado con el flujo normativo del Concejo)."),
  bullet("Aporte realizado", "Modelado e implementación de la macro-bifurcación en Ventanilla Única, la sub-asignación interna en Comisiones con cálculo de SLA dinámico (5 a 15 días hábiles), la persistencia de los cinco instrumentos legislativos (PIE, PIO, Minuta, Resolución, Nota Externa) y el circuito de firmas duales de Presidencia y Secretaría General."),
  bullet("Dificultades encontradas y superadas", "La modelación de la coexistencia entre el traslado físico de expedientes en mensajería y su reflejo computacional requirió concebir un estado específico ('POR_RECIBIR') para congelar el cómputo de SLA hasta la confirmación formal de recepción en el despacho."),
  bullet("Lecciones aprendidas", "Los sistemas de workflow gubernamentales no pueden concebirse como flujos lineales genéricos; deben absorber estrictamente las especificidades colegiadas y los plazos normativos fijados en los reglamentos de debate parlamentario."),
  bullet("Recomendaciones", "Capacitar continuamente a los asesores de comisión y personal de mensajería para que la confirmación de recepción digital se ejecute en el momento exacto de entrega del expediente físico, garantizando la exactitud de las métricas de SLA."),

  // Conclusión OE4
  h3("Conclusiones respecto al Objetivo Específico 4: Interfaz React, Hoja de Ruta, Transparencia y Pruebas E2E"),
  bullet("Grado de cumplimiento", "100% (Completado; pruebas automatizadas y componentes de transparencia operativos)."),
  bullet("Aporte realizado", "Desarrollo de una SPA interactiva en React 19 con el Sistema de Diseño de la Gaceta Municipal de Sucre; generación automatizada de la Hoja de Ruta oficial para impresión; módulo público de consulta ciudadana sin login; y suite automatizada E2E con Playwright validando la totalidad del circuito legislativo."),
  bullet("Dificultades encontradas y superadas", "Garantizar la compatibilidad de estilos de impresión en diversos navegadores para la Hoja de Ruta física, lo cual se solventó mediante reglas CSS específicas de paginación y diseño tipográfico vectorial."),
  bullet("Lecciones aprendidas", "La automatización de pruebas E2E desde etapas tempranas previene eficazmente la aparición de regresiones funcionales al refactorizar componentes o modificar procedimientos de base de datos."),
  bullet("Recomendaciones", "Incorporar la ejecución de las suites de Playwright en un pipeline de integración continua (CI/CD) antes de cualquier despliegue a los servidores de producción del Concejo Municipal."),
  new Paragraph({ children: [new PageBreak()] })
);

// ==============================================================================
// 5. ANEXOS
// ==============================================================================
docElements.push(
  h1("5. ANEXOS"),
  p(
    "La presente sección reúne la documentación formal, administrativa, legal y técnica complementaria que respalda la ejecución de la Práctica Laboral (SHC170) desarrollada en el Concejo Municipal de Sucre durante la gestión 2026. A continuación, se estructuran las carátulas correspondientes a cada apartado documental:",
    { indent: true }
  ),
  new Paragraph({ children: [new PageBreak()] }),

  // Anexo 1
  ...carátulaAnexo(
    "1",
    "ANEXOS GENERALES DEL PROYECTO",
    "Marco Documental y Técnico Institucional",
    "Contiene el índice y descripción de los documentos probatorios, certificaciones académicas y registros oficiales de la Práctica Laboral."
  ),
  new Paragraph({ children: [new PageBreak()] }),

  // Anexo 2
  ...carátulaAnexo(
    "2",
    "CONVENIO INTERINSTITUCIONAL",
    "Acuerdo de Cooperación Académica y Práctica Laboral",
    "Espacio reservado para la incorporación del Convenio Formal suscrito entre la Universidad Mayor, Real y Pontificia de San Francisco Xavier de Chuquisaca y el Concejo Municipal de Sucre."
  ),
  new Paragraph({ children: [new PageBreak()] }),

  // Anexo 3
  ...carátulaAnexo(
    "3",
    "DOCUMENTOS DE PRÁCTICA LABORAL",
    "Formularios Oficiales de Acreditación Curricular",
    "Espacio reservado para la Solicitud Formal de Práctica Laboral, Carta de Aceptación Institucional y Formulario de Registro de Entidad Laboral Receptora (Carrera de Ingeniería de Sistemas)."
  ),
  new Paragraph({ children: [new PageBreak()] }),

  // Anexo 4
  ...carátulaAnexo(
    "4",
    "INFORMES PERIÓDICOS DE PRÁCTICA",
    "Bitácoras Semanales y Reportes de Sprint",
    "Recopilación de los Informes Semanales de Avance, Bitácoras de Asistencia Laboral y Reportes de Cierre de Sprint (Sprints 1 al 6) validados por el Tutor Institucional."
  ),
  new Paragraph({ children: [new PageBreak()] }),

  // Anexo 5
  ...carátulaAnexo(
    "5",
    "OTROS DOCUMENTOS TÉCNICOS Y EVIDENCIAS",
    "Diagramas de Arquitectura, Manuales, Código Fuente y Auditoría",
    "Incluye registros fotográficos de las actividades en el Concejo Municipal, diagramas entidad-relación extendidos, catálogo detallado de procedimientos almacenados T-SQL, informe de auditoría de seguridad y manual de usuario del sistema Wayka."
  )
);

// Creación del documento global docx
const doc = new Document({
  creator: "Pablo Jancko",
  title: "Informe Final de Práctica Laboral - Sistema Wayka Concejo Municipal de Sucre",
  description: "Informe Final de Práctica Laboral SHC170 en el Concejo Municipal de Sucre",
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 pulgada = 2.54 cm = 1440 dxa (Normas APA)
            bottom: 1440,
            left: 1440,
            right: 1440
          }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Concejo Municipal de Sucre | Sistema Wayka  —  Pág. ",
                  font: FONT_NAME,
                  size: FONT_SIZE_SMALL,
                  color: "666666"
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: FONT_NAME,
                  size: FONT_SIZE_SMALL,
                  bold: true,
                  color: "333333"
                })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120 },
              children: [
                new TextRun({
                  text: "Informe Final de Práctica Laboral (SHC170) — Facultad de Tecnología — USFX",
                  font: FONT_NAME,
                  size: FONT_SIZE_SMALL,
                  italics: true,
                  color: "777777"
                })
              ]
            })
          ]
        })
      },
      children: docElements
    }
  ]
});

const outputPath = path.join(__dirname, '..', 'INFORME_FINAL_PRACTICA_LABORAL_WAYKA_CMS.docx');

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Documento generado exitosamente en: ${outputPath}`);
  console.log(`Tamaño del archivo: ${buffer.length} bytes`);
}).catch(err => {
  console.error("Error al generar el documento Word:", err);
  process.exit(1);
});

