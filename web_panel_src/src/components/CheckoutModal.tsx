import React, { useState } from 'react';
import { CartItem, CurrentUser } from '../types';
import { X, ShieldCheck, CheckCircle2, Printer, CreditCard, Sparkles, Loader2, ArrowLeft } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currentUser: CurrentUser | null;
  onPurchaseSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  onPurchaseSuccess
}) => {
  const [customerName, setCustomerName] = useState(currentUser?.username || '');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discordId, setDiscordId] = useState(currentUser?.userId || '');
  const [paymentMethod, setPaymentMethod] = useState<'culqi_yape' | 'culqi_card'>('culqi_yape');

  // Yape inputs
  const [yapePhone, setYapePhone] = useState('');
  const [yapeOtp, setYapeOtp] = useState('');

  // Card inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo y correo electrónico.');
      return;
    }

    if (paymentMethod === 'culqi_yape') {
      const cleanPhone = yapePhone.replace(/\D/g, '');
      const cleanOtp = yapeOtp.replace(/\D/g, '');
      if (cleanPhone.length !== 9) {
        setErrorMessage('El número de celular de Yape debe tener 9 dígitos.');
        return;
      }
      if (cleanOtp.length !== 6) {
        setErrorMessage('El código de aprobación de Yape debe tener 6 dígitos.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        items: items.map(i => ({ id: i.product.id, quantity: i.quantity })),
        customer: {
          name: customerName.trim(),
          email: customerEmail.trim(),
          phone: customerPhone.trim() || yapePhone.trim(),
          discordId: discordId.trim() || undefined
        },
        paymentMethod,
        yapePhone: yapePhone.trim(),
        yapeOtp: yapeOtp.trim()
      };

      const res = await fetch('/api/checkout/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar el pago.');
      }

      setSuccessReceipt(data);
      onPurchaseSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo completar el pago. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#121212] border-2 border-[#2C2C2C] text-white w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[#222] bg-[#181818] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-mono font-black uppercase text-white tracking-wider">
              CHECKOUT SEGURO // PAGO EN LÍNEA
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {successReceipt ? (
            /* Success Receipt Screen */
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  ¡PAGO PROCESADO EXITOSAMENTE!
                </span>
                <h2 className="text-xl font-black italic tracking-tighter uppercase text-white mt-1">
                  COMPROBANTE DE COMPRA
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Hemos enviado una copia detallada a: <strong className="text-white">{successReceipt.customer?.email}</strong>
                </p>
              </div>

              {/* Receipt Card */}
              <div className="bg-[#181818] border border-[#2D2D2D] p-4 text-left font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-[#2A2A2A] pb-2 text-neutral-400">
                  <span>Código de Referencia:</span>
                  <strong className="text-[#FF5500]">{successReceipt.referenceCode}</strong>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Orden:</span>
                  <span className="text-white">{successReceipt.orderId}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Cliente:</span>
                  <span className="text-white">{successReceipt.customer?.name}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Fecha:</span>
                  <span className="text-white">{new Date().toLocaleString('es-PE')}</span>
                </div>

                <div className="border-t border-[#2A2A2A] pt-2">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">
                    Productos Adquiridos:
                  </span>
                  {successReceipt.items?.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px] py-0.5">
                      <span className="text-neutral-300">{it.quantity}x {it.name}</span>
                      <span className="text-white font-bold">S/ {it.itemTotal?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-black text-white">
                  <span>TOTAL PAGADO:</span>
                  <span className="text-emerald-400 font-mono">
                    S/ {successReceipt.totalAmount?.toFixed(2)} PEN
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#222] hover:bg-[#2A2A2A] border border-[#444] text-xs font-mono font-bold text-white uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir Comprobante
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-xs font-mono font-black text-white uppercase transition-all shadow-md cursor-pointer"
                >
                  Continuar
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handleSubmitPayment} className="space-y-5">
              {/* Order Quick Summary */}
              <div className="bg-[#161616] border border-[#262626] p-3 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Total a Pagar ({items.reduce((a, b) => a + b.quantity, 0)} items):</span>
                  <span className="text-base font-black text-[#FF5500]">S/ {totalAmount.toFixed(2)} PEN</span>
                </div>
                <div className="text-right text-[10px] text-neutral-400">
                  <span>IGV 18% incluido</span>
                  <span className="block text-emerald-400">SSL Cifrado</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-neutral-300 border-b border-[#222] pb-1">
                  1. Datos del Comprador
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                      Nombres y Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-[#181818] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                      Correo Electrónico (para comprobante) *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full bg-[#181818] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                      Celular de Contacto
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ej: 987654321"
                      className="w-full bg-[#181818] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                      Discord ID / Nickname (Opcional)
                    </label>
                    <input
                      type="text"
                      value={discordId}
                      onChange={(e) => setDiscordId(e.target.value)}
                      placeholder="Para acreditar créditos"
                      className="w-full bg-[#181818] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-neutral-300 border-b border-[#222] pb-1">
                  2. Método de Pago (Yape o Tarjeta)
                </h4>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('culqi_yape')}
                    className={`py-2 px-3 border text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      paymentMethod === 'culqi_yape'
                        ? 'bg-[#742284] border-[#A855F7] text-white shadow-md'
                        : 'bg-[#181818] border-[#2E2E2E] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Pagar con Yape
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('culqi_card')}
                    className={`py-2 px-3 border text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      paymentMethod === 'culqi_card'
                        ? 'bg-[#0055AA] border-[#0088FF] text-white shadow-md'
                        : 'bg-[#181818] border-[#2E2E2E] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Tarjeta Débito/Crédito
                  </button>
                </div>

                {/* Yape Form Fields */}
                {paymentMethod === 'culqi_yape' && (
                  <div className="bg-[#1C1220] border border-[#742284]/50 p-4 space-y-3 font-mono">
                    <div className="text-[10px] text-purple-200 bg-[#2C1835] p-2 border border-[#742284]/30">
                      ℹ️ <strong>¿Cómo pagar con Yape?</strong> Ingresa a tu app de Yape &gt; Abre el Menú &gt; Selecciona <strong>Código de aprobación</strong> de 6 dígitos.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-neutral-300 uppercase font-bold mb-1">
                          Número de Celular Yape (9 dígitos) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={9}
                          value={yapePhone}
                          onChange={(e) => setYapePhone(e.target.value)}
                          placeholder="Ej: 987654321"
                          className="w-full bg-[#111] border border-[#444] px-3 py-1.5 text-white focus:outline-none focus:border-[#A855F7]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-300 uppercase font-bold mb-1">
                          Código de Aprobación OTP (6 dígitos) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={yapeOtp}
                          onChange={(e) => setYapeOtp(e.target.value)}
                          placeholder="Ej: 123456"
                          className="w-full bg-[#111] border border-[#444] px-3 py-1.5 text-white tracking-widest font-black focus:outline-none focus:border-[#A855F7]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Form Fields */}
                {paymentMethod === 'culqi_card' && (
                  <div className="bg-[#121A25] border border-[#0055AA]/50 p-4 space-y-3 font-mono text-xs">
                    <div>
                      <label className="block text-[10px] text-neutral-300 uppercase font-bold mb-1">
                        Número de Tarjeta *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full bg-[#111] border border-[#444] px-3 py-1.5 text-white focus:outline-none focus:border-[#0088FF]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-300 uppercase font-bold mb-1">
                          Vencimiento (MM/AA) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="w-full bg-[#111] border border-[#444] px-3 py-1.5 text-white focus:outline-none focus:border-[#0088FF]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-300 uppercase font-bold mb-1">
                          CVV *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          className="w-full bg-[#111] border border-[#444] px-3 py-1.5 text-white focus:outline-none focus:border-[#0088FF]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs font-mono">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="border-t border-[#222] pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-neutral-700 text-xs font-mono font-bold text-neutral-300 hover:text-white uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 text-xs font-mono font-black uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 cursor-pointer ${
                    paymentMethod === 'culqi_yape'
                      ? 'bg-[#742284] hover:bg-[#8B2FA0] border border-[#742284] text-white shadow-purple-900/40'
                      : 'bg-[#0088FF] hover:bg-[#0099FF] border border-[#0088FF] text-white shadow-blue-900/40'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando pago...</span>
                    </>
                  ) : (
                    <span>
                      Confirmar y Pagar S/ {totalAmount.toFixed(2)} PEN
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
