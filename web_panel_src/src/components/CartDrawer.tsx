import React from 'react';
import { CartItem } from '../types';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const igvIncluded = totalAmount * 0.18 / 1.18;
  const subtotalNeto = totalAmount - igvIncluded;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-md bg-[#111] border-l-4 border-[#1A1A1A] text-white flex flex-col h-full shadow-2xl relative">
        
        {/* Header */}
        <div className="p-5 border-b border-[#222] flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FF5500]" />
            <h3 className="text-sm font-mono font-black uppercase text-white tracking-wider">
              CARRITO DE COMPRAS ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <ShoppingBag className="w-12 h-12 mx-auto text-neutral-600 mb-3 stroke-1" />
              <p className="font-mono text-sm mb-4">Tu carrito de compras está vacío.</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#FF5500] hover:bg-[#FF7733] text-white text-xs font-mono font-bold uppercase transition-all cursor-pointer"
              >
                Ver Catálogo de Productos
              </button>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.product.id}
                className="bg-[#181818] border border-[#262626] p-3 flex gap-3 relative group"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover border border-[#333] shrink-0"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-1">
                      {item.product.name}
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Unitario: S/ {item.product.price.toFixed(2)} PEN
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity controls */}
                    <div className="flex items-center border border-[#333] bg-[#111]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-neutral-400 hover:text-white hover:bg-[#222] transition-colors cursor-pointer text-xs"
                        title="Disminuir"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-mono font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-neutral-400 hover:text-white hover:bg-[#222] transition-colors cursor-pointer text-xs"
                        title="Aumentar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-[#FF5500]">
                        S/ {(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.product.id)}
                  className="text-neutral-500 hover:text-red-400 p-1 self-start transition-colors cursor-pointer"
                  title="Eliminar producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer / Summary */}
        {items.length > 0 && (
          <div className="p-5 border-t border-[#222] bg-[#161616] space-y-4">
            <div className="space-y-1.5 text-xs font-mono text-neutral-300">
              <div className="flex justify-between">
                <span>Subtotal neto:</span>
                <span>S/ {subtotalNeto.toFixed(2)} PEN</span>
              </div>
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>IGV (18% incluido según ley):</span>
                <span>S/ {igvIncluded.toFixed(2)} PEN</span>
              </div>
              <div className="border-t border-[#2D2D2D] pt-2 flex justify-between text-base font-black text-white">
                <span>TOTAL A PAGAR:</span>
                <span className="text-[#FF5500]">S/ {totalAmount.toFixed(2)} PEN</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Transacción cifrada y protegida con SSL 256-Bit</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClearCart}
                className="px-3 py-2 border border-neutral-700 hover:border-neutral-500 text-xs font-mono font-bold text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                Vaciar
              </button>

              <button
                type="button"
                onClick={onProceedToCheckout}
                className="flex-1 py-3 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white text-xs font-mono font-black uppercase tracking-wider transition-all shadow-xl shadow-[#FF5500]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceder al Pago</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
