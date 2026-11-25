import React, { useState, useEffect, useRef } from 'react';
import { tramitesService } from '../../services/api';
import HojaDeRutaDocument from './HojaDeRutaDocument';

/**
 * Impresión directa de la Hoja de Ruta, sin abrir ningún modal ni pestaña.
 *
 * El documento se monta en un contenedor oculto en pantalla y se muestra solo
 * en @media print. En cuanto los datos están listos se dispara window.print();
 * al cerrar el diálogo (afterprint) se limpia el estado y el componente se
 * desmonta mediante onDone.
 */
export default function ImpresionHojaDeRuta({ tramiteId, initialData = null, onDone }) {
  const [data, setData] = useState(null);
  const impresoRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (initialData && (!tramiteId || initialData.id === tramiteId)) {
      setData(initialData);
      return;
    }

    if (!tramiteId) return;

    let activo = true;
    tramitesService.getById(tramiteId)
      .then((res) => {
        if (activo && res.success && res.data) setData(res.data);
      })
      .catch((err) => {
        console.error('No se pudo cargar la Hoja de Ruta para imprimir:', err);
        if (activo) onDoneRef.current?.();
      });

    return () => { activo = false; };
  }, [tramiteId, initialData]);

  useEffect(() => {
    if (!data || impresoRef.current) return undefined;
    impresoRef.current = true;

    document.body.classList.add('imprimiendo-hoja-ruta');

    const finalizar = () => {
      document.body.classList.remove('imprimiendo-hoja-ruta');
      onDoneRef.current?.();
    };

    window.addEventListener('afterprint', finalizar, { once: true });
    const frame = requestAnimationFrame(() => {
      window.print();
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', finalizar);
      document.body.classList.remove('imprimiendo-hoja-ruta');
    };
  }, [data]);

  return (
    <div className="hoja-ruta-print-root" aria-hidden="true">
      <HojaDeRutaDocument data={data} />
    </div>
  );
}
