import React, { useState } from 'react';
import { ClaimFormData } from '../types';
import { BookOpen, ShieldCheck, CheckCircle2, AlertTriangle, Printer, Send, Clock, FileText } from 'lucide-react';

export const LibroReclamacionesView: React.FC = () => {
  const [formData, setFormData] = useState<ClaimFormData>({
    consumerName: '',
    consumerDocType: 'DNI',
    consumerDocNumber: '',
    consumerEmail: '',
    consumerPhone: '',
    consumerAddress: '',
    isMinor: false,
    parentName: '',
    parentDocNumber: '',
    contractedType: 'SERVICIO',
    claimedAmount: '',
    goodsDescription: '',
    claimType: 'RECLAMO',
    claimDetail: '',
    consumerRequest: '',
    acceptTerms: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedClaim, setSubmittedClaim] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.acceptTerms) {
      setErrorMessage('Debes aceptar la declaración jurada y confirmación de veracidad de datos conforme a ley.');
      return;
    }

    if (!formData.consumerName.trim() || !formData.consumerDocNumber.trim() || !formData.consumerEmail.trim()) {
      setErrorMessage('Por favor completa todos tus datos personales obligatorios.');
      return;
    }

    if (!formData.claimDetail.trim() || !formData.consumerRequest.trim()) {
      setErrorMessage('Por favor ingresa el detalle de tu reclamación y el pedido concreto.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/reclamaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al registrar la reclamación.');
      }

      setSubmittedClaim(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSubmittedClaim(null);
    setFormData({
      consumerName: '',
      consumerDocType: 'DNI',
      consumerDocNumber: '',
      consumerEmail: '',
      consumerPhone: '',
      consumerAddress: '',
      isMinor: false,
      parentName: '',
      parentDocNumber: '',
      contractedType: 'SERVICIO',
      claimedAmount: '',
      goodsDescription: '',
      claimType: 'RECLAMO',
      claimDetail: '',
      consumerRequest: '',
      acceptTerms: false
    });
  };

  const todayStr = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="py-8 px-4 sm:px-6 max-w-4xl mx-auto text-white font-sans">
      {/* Official Banner Header */}
      <div className="bg-[#121212] border-2 border-[#1E3A5F] p-6 mb-8 shadow-2xl relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#1E3A5F] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#0088FF]/15 border border-[#0088FF] rounded-none flex items-center justify-center text-[#0088FF] shadow-lg">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-white font-mono">
                LIBRO DE RECLAMACIONES VIRTUAL
              </h1>
              <p className="text-[11px] text-cyan-300 font-mono">
                CONFORME A LOS LINEAMIENTOS DE INDECOPI // D.S. N° 011-2011-PCM
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-neutral-400">
            <span className="block text-white font-bold">Fecha: {todayStr}</span>
            <span className="text-emerald-400">Plataforma Digital Nativa</span>
          </div>
        </div>

        {/* Company Legal Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-neutral-300 bg-[#0E1520] p-3 border border-[#1E3A5F]/50">
          <div>
            <strong className="text-white block text-[10px] uppercase text-neutral-400">Plataforma:</strong>
            MachuPeek CS2
          </div>
          <div>
            <strong className="text-white block text-[10px] uppercase text-neutral-400">Atención al Usuario:</strong>
            Online (Perú)
          </div>
          <div>
            <strong className="text-white block text-[10px] uppercase text-neutral-400">Canal de Contacto:</strong>
            machupeek@gmail.com
          </div>
        </div>
      </div>

      {submittedClaim ? (
        /* Printable Official Claim Confirmation Sheet */
        <div className="bg-[#121212] border-2 border-emerald-500 p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in font-mono print:border-black print:text-black print:bg-white">
          <div className="text-center border-b-2 border-emerald-500 pb-5">
            <div className="w-14 h-14 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
              HOJA DE RECLAMACIÓN REGISTRADA
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              N° DE REGISTRO: <span className="text-[#FF5500]">{submittedClaim.claimCode}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-2">
              Se ha remitido una copia digital completa de esta Hoja de Reclamación al correo electrónico registrado.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="border border-[#333] p-4 bg-[#181818] space-y-2">
              <h3 className="font-bold text-white border-b border-[#2C2C2C] pb-1 uppercase text-[11px] text-cyan-300">
                1. Datos del Consumidor Reclamante
              </h3>
              <div className="grid grid-cols-2 gap-2 text-neutral-300">
                <div><span>Nombre:</span> <strong className="text-white">{formData.consumerName}</strong></div>
                <div><span>{formData.consumerDocType}:</span> <strong className="text-white">{formData.consumerDocNumber}</strong></div>
                <div><span>Email:</span> <strong className="text-white">{formData.consumerEmail}</strong></div>
                <div><span>Teléfono:</span> <strong className="text-white">{formData.consumerPhone || 'No especificado'}</strong></div>
                <div className="col-span-2"><span>Dirección:</span> <strong className="text-white">{formData.consumerAddress || 'No especificado'}</strong></div>
              </div>
            </div>

            <div className="border border-[#333] p-4 bg-[#181818] space-y-2">
              <h3 className="font-bold text-white border-b border-[#2C2C2C] pb-1 uppercase text-[11px] text-cyan-300">
                2. Identificación del Bien Contratado
              </h3>
              <div className="grid grid-cols-2 gap-2 text-neutral-300">
                <div><span>Tipo de bien:</span> <strong className="text-white">{formData.contractedType}</strong></div>
                <div><span>Monto reclamado:</span> <strong className="text-white">S/ {formData.claimedAmount || '0.00'} PEN</strong></div>
                <div className="col-span-2"><span>Descripción:</span> <strong className="text-white">{formData.goodsDescription || 'Servicios competitivos de MachuPeek'}</strong></div>
              </div>
            </div>

            <div className="border border-[#333] p-4 bg-[#181818] space-y-2">
              <h3 className="font-bold text-white border-b border-[#2C2C2C] pb-1 uppercase text-[11px] text-cyan-300">
                3. Detalle de la Reclamación ({formData.claimType})
              </h3>
              <div className="space-y-2 text-neutral-300">
                <div>
                  <span className="block text-[10px] text-neutral-400 uppercase">Detalle y Hechos:</span>
                  <p className="bg-[#111] p-2 text-white border border-[#222] mt-1 whitespace-pre-wrap">{formData.claimDetail}</p>
                </div>
                <div>
                  <span className="block text-[10px] text-neutral-400 uppercase">Pedido Concreto:</span>
                  <p className="bg-[#111] p-2 text-white border border-[#222] mt-1 whitespace-pre-wrap">{formData.consumerRequest}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#1B2838] border border-[#0088FF]/40 text-[11px] text-cyan-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>PLAZO MÁXIMO DE RESPUESTA: 15 DÍAS HÁBILES</span>
              </div>
              <p>
                De acuerdo al Código de Protección y Defensa del Consumidor, MachuPeek dará respuesta formal por escrito al correo consignado en un plazo no mayor a 15 días hábiles improrrogables.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4 border-t border-[#333]">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-[#252525] hover:bg-[#333] border border-[#555] text-white text-xs uppercase font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimir Hoja de Reclamación
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 bg-[#FF5500] hover:bg-[#FF7733] text-white text-xs uppercase font-black transition-all cursor-pointer"
            >
              Registrar Otra Reclamación
            </button>
          </div>
        </div>
      ) : (
        /* Native INDECOPI Form (NO external Google Drive forms) */
        <form onSubmit={handleSubmit} className="bg-[#121212] border-2 border-[#242424] p-6 sm:p-8 space-y-6 shadow-2xl">
          
          {/* Section 1: Consumidor */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase text-[#0088FF] border-b border-[#222] pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 1. Identificación del Consumidor Reclamante
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Nombres y Apellidos Completos *
                </label>
                <input
                  type="text"
                  required
                  value={formData.consumerName}
                  onChange={(e) => setFormData({ ...formData, consumerName: e.target.value })}
                  placeholder="Ej: Carlos Gómez Mendoza"
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                    Tipo Doc. *
                  </label>
                  <select
                    value={formData.consumerDocType}
                    onChange={(e) => setFormData({ ...formData, consumerDocType: e.target.value })}
                    className="w-full bg-[#181818] border border-[#333] px-2 py-2 text-white focus:outline-none focus:border-[#0088FF] cursor-pointer"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">C.E.</option>
                    <option value="PASAPORTE">Pasap.</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.consumerDocNumber}
                    onChange={(e) => setFormData({ ...formData, consumerDocNumber: e.target.value })}
                    placeholder="Número de documento"
                    className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Correo Electrónico (para notificación de respuesta) *
                </label>
                <input
                  type="email"
                  required
                  value={formData.consumerEmail}
                  onChange={(e) => setFormData({ ...formData, consumerEmail: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Teléfono o Celular *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.consumerPhone}
                  onChange={(e) => setFormData({ ...formData, consumerPhone: e.target.value })}
                  placeholder="Ej: 987654321"
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Domicilio (Dirección, Distrito, Ciudad) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.consumerAddress}
                  onChange={(e) => setFormData({ ...formData, consumerAddress: e.target.value })}
                  placeholder="Ej: Av. Arequipa 123, Miraflores, Lima"
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>
            </div>

            {/* Checkbox menor de edad */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-neutral-300">
                <input
                  type="checkbox"
                  checked={formData.isMinor}
                  onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
                  className="w-4 h-4 rounded-none accent-[#0088FF]"
                />
                <span>El reclamante es menor de edad</span>
              </label>

              {formData.isMinor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-[#181818] border border-[#2D2D2D] text-xs font-mono">
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                      Nombre del Padre / Madre / Tutor *
                    </label>
                    <input
                      type="text"
                      required={formData.isMinor}
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="Nombre del apoderado"
                      className="w-full bg-[#111] border border-[#333] px-3 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                      DNI del Padre / Madre / Tutor *
                    </label>
                    <input
                      type="text"
                      required={formData.isMinor}
                      value={formData.parentDocNumber}
                      onChange={(e) => setFormData({ ...formData, parentDocNumber: e.target.value })}
                      placeholder="DNI del apoderado"
                      className="w-full bg-[#111] border border-[#333] px-3 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Bien Contratado */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-mono font-bold uppercase text-[#0088FF] border-b border-[#222] pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 2. Identificación del Bien Contratado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Tipo de Contratación *
                </label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-white">
                    <input
                      type="radio"
                      name="contractedType"
                      value="SERVICIO"
                      checked={formData.contractedType === 'SERVICIO'}
                      onChange={() => setFormData({ ...formData, contractedType: 'SERVICIO' })}
                      className="accent-[#0088FF]"
                    />
                    <span>Servicio</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-white">
                    <input
                      type="radio"
                      name="contractedType"
                      value="PRODUCTO"
                      checked={formData.contractedType === 'PRODUCTO'}
                      onChange={() => setFormData({ ...formData, contractedType: 'PRODUCTO' })}
                      className="accent-[#0088FF]"
                    />
                    <span>Producto</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Monto Reclamado en Soles (S/)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.claimedAmount}
                  onChange={(e) => setFormData({ ...formData, claimedAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Descripción del Producto o Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.goodsDescription}
                  onChange={(e) => setFormData({ ...formData, goodsDescription: e.target.value })}
                  placeholder="Ej: Torneo Mixtón / Membresía / Saldo"
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Detalle de la Reclamación */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-mono font-bold uppercase text-[#0088FF] border-b border-[#222] pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 3. Detalle de la Reclamación (Reclamo o Queja)
            </h3>

            {/* Definitions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <label
                className={`p-3 border cursor-pointer transition-all ${
                  formData.claimType === 'RECLAMO'
                    ? 'bg-[#0088FF]/15 border-[#0088FF] text-white'
                    : 'bg-[#181818] border-[#2E2E2E] text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <input
                    type="radio"
                    name="claimType"
                    value="RECLAMO"
                    checked={formData.claimType === 'RECLAMO'}
                    onChange={() => setFormData({ ...formData, claimType: 'RECLAMO' })}
                    className="accent-[#0088FF]"
                  />
                  <span>RECLAMO</span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-normal">
                  Disconformidad relacionada directamente a los bienes o servicios adquiridos.
                </p>
              </label>

              <label
                className={`p-3 border cursor-pointer transition-all ${
                  formData.claimType === 'QUEJA'
                    ? 'bg-[#0088FF]/15 border-[#0088FF] text-white'
                    : 'bg-[#181818] border-[#2E2E2E] text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <input
                    type="radio"
                    name="claimType"
                    value="QUEJA"
                    checked={formData.claimType === 'QUEJA'}
                    onChange={() => setFormData({ ...formData, claimType: 'QUEJA' })}
                    className="accent-[#0088FF]"
                  />
                  <span>QUEJA</span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-normal">
                  Disconformidad no relacionada a los productos o servicios; malestar respecto a la atención al público.
                </p>
              </label>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Detalle de los Hechos (Explicación detallada) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.claimDetail}
                  onChange={(e) => setFormData({ ...formData, claimDetail: e.target.value })}
                  placeholder="Describe con claridad los hechos, fecha del suceso y lo acontecido..."
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                  Pedido Concreto del Consumidor *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.consumerRequest}
                  onChange={(e) => setFormData({ ...formData, consumerRequest: e.target.value })}
                  placeholder="Indica la solución concreta que solicitas a MachuPeek..."
                  className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Declaración y Aviso Legal INDECOPI */}
          <div className="bg-[#10141C] border border-[#1E3A5F] p-4 space-y-3 text-xs font-mono">
            <label className="flex items-start gap-2.5 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                required
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded-none accent-[#0088FF] shrink-0"
              />
              <span className="text-[11px] leading-relaxed">
                Declaro que los datos consignados en la presente Hoja de Reclamación son verídicos y acepto recibir la respuesta formal a mi correo electrónico.
              </span>
            </label>

            <div className="text-[10px] text-neutral-400 space-y-1.5 border-t border-[#1E3A5F]/40 pt-2 leading-relaxed">
              <p>
                ⚖️ <strong>Aviso Legal INDECOPI:</strong> La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
              </p>
              <p>
                ⏱️ El proveedor responderá al reclamo en un plazo máximo de quince (15) días hábiles improrrogables.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="text-right">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-[#0088FF] hover:bg-[#0077EE] border border-[#0088FF] text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-[#0088FF]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Registrando en INDECOPI...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Hoja de Reclamación</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
