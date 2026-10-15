import React, { useState } from 'react';
import { StoreProduct } from '../types';
import { ShoppingCart, Zap, Check, ShieldCheck, Sparkles, Trophy, Award, Search, Filter } from 'lucide-react';

export const INITIAL_PRODUCTS: StoreProduct[] = [
  {
    id: 'prod_torneo_diario',
    name: 'Entrada a Torneo Mixtón Diario',
    category: 'Torneos',
    price: 5.00,
    currency: 'PEN',
    badge: 'Más Vendido',
    description: 'Pase de acceso individual válido para 1 jornada completa de torneos Mixtón en servidores de 128 tickrate con anticheat FACEIT. Emparejamiento balanceado por Tiers competitivos (S, A, B, C) y registro oficial de estadísticas en el portal.',
    features: [
      'Acceso a todas las partidas clasificatorias de la fecha',
      'Servidores dedicados de bajo ping ubicados en Lima',
      'Anticheat obligatorio oficial de FACEIT activo',
      'Registro en tiempo real de estadísticas K/D y ADR',
      'Participación por los premios diarios del podio'
    ],
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 'prod_pack_10',
    name: 'Pack Gamer - 10 Créditos de Pozo',
    category: 'Créditos',
    price: 10.00,
    currency: 'PEN',
    badge: 'Básico',
    description: 'Paquete de 10 créditos virtuales en cuenta para participar en cuotas, retos 5v5 y pozos acumulados de partidas competitivas en la Arena Mixtón. Acreditación automática e instantánea a tu billetera gamer.',
    features: [
      '10 créditos para cuotas y retos de partidas',
      'Acceso a pozos acumulados con premios en efectivo',
      'Acreditación inmediata al pagar con Yape o Tarjeta',
      'Los créditos no tienen fecha de vencimiento',
      'Reembolsable si no se utiliza según nuestra política'
    ],
    image: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 'prod_pack_25',
    name: 'Pack Pro - 25 Créditos + Insignia Destacada',
    category: 'Créditos',
    price: 25.00,
    currency: 'PEN',
    badge: 'Recomendado',
    description: 'Paquete avanzado de 25 créditos para torneos y partidas de pozo alto. Incluye insignia distintiva dorada en tu perfil del lobby y prioridad en colas de emparejamiento con capitanes.',
    features: [
      '25 créditos de pozo para partidas y torneos oficiales',
      'Insignia PRO dorada en tu perfil público del lobby',
      'Prioridad de asignación en salas y colas de espera',
      'Soporte preferencial vía canal de Discord del staff',
      'Participación automática en sorteos bimestrales'
    ],
    image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 'prod_vip_30',
    name: 'Membresía VIP Club Mensual (30 Días)',
    category: 'Membresías',
    price: 35.00,
    currency: 'PEN',
    badge: 'VIP',
    description: 'Suscripción mensual de 30 días con acceso total a salas de entrenamiento exclusivas, registro de analítica avanzada de mapas y K/D, rol VIP con color personalizado en Discord y soporte técnico prioritario 24/7.',
    features: [
      'Acceso irrestricto a todas las salas privadas VIP',
      'Rol exclusivo VIP en Discord con mención destacada',
      'Acceso a métricas avanzadas (ADR, First Kills, Clutch %)',
      'Sorteos mensuales de skins de Counter-Strike 2',
      'Canal privado de comunicación directa con moderadores'
    ],
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 'prod_season_pass',
    name: 'Season Pass CS2 Arena (Pase Oficial de Temporada)',
    category: 'Temporadas',
    price: 50.00,
    currency: 'PEN',
    badge: 'Temporada',
    description: 'Inscripción oficial a la tabla de clasificación por premios en efectivo al final de la temporada. Compite por el pozo acumulado en Soles (PEN) reservado para el Top 10 y obtén tu medalla honorífica digital.',
    features: [
      'Inscripción oficial al Leaderboard de la Temporada',
      'Acceso al pozo acumulado de premios en efectivo en Soles',
      'Medalla honorífica digital exhibida en el sitio web',
      'Pase directo a las finales transmitidas por streaming',
      'Descuento del 15% en futuras renovaciones'
    ],
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 'prod_coaching_1h',
    name: 'Sesión de Coaching Táctico & Demo Review (1 Hora)',
    category: 'Entrenamiento',
    price: 40.00,
    currency: 'PEN',
    badge: 'Masterclass',
    description: 'Clase táctica individual de 60 minutos con un analista o jugador de nivel 10 FACEIT. Incluye revisión profunda de tus grabaciones (demos), corrección de posicionamiento, mira, utilidades y optimización de configuraciones.',
    features: [
      '60 minutos de sesión individual por voz y pantalla compartida',
      'Análisis cuadro a cuadro de 2 demos de tus partidas',
      'Guía estratégica de utilidades (humos, flashes, molotovs)',
      'Plan individual de práctica y entrenamiento de puntería',
      'Documento de resumen con recomendaciones clave'
    ],
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=700&q=80'
  }
];

interface StoreViewProps {
  onAddToCart: (product: StoreProduct) => void;
  onBuyNow: (product: StoreProduct) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({ onAddToCart, onBuyNow }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categories = ['TODOS', 'Torneos', 'Créditos', 'Membresías', 'Temporadas', 'Entrenamiento'];

  const filteredProducts = INITIAL_PRODUCTS.filter(product => {
    const matchesCategory = selectedCategory === 'TODOS' || product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto text-white">
      {/* Hero Banner Tienda */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#181818] via-[#121212] to-[#181818] border-2 border-[#2A2A2A] p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF5500]/20 border border-[#FF5500]/50 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <Trophy className="w-3.5 h-3.5" /> TIENDA Y SERVICIOS OFICIALES DE MIXTON ARENA
          </div>
          <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase leading-tight mb-3">
            POTENCIA TU EXPERIENCIA <span className="text-[#FF5500]">COMPETITIVA</span>
          </h2>
          <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed mb-6">
            Adquiere entradas a torneos diarios, créditos para pozos de partidas, membresías VIP del club y sesiones de coaching profesional para Counter-Strike 2. Todos los precios se encuentran en Soles (PEN) con impuestos incluidos y procesamiento seguro a través de Culqi y Yape.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-neutral-300">
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-2 border border-[#333]">
              <Zap className="w-3.5 h-3.5 text-[#FF5500]" /> Entrega Inmediata
            </div>
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-2 border border-[#333]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Pagos Seguros Culqi
            </div>
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-2 border border-[#333]">
              <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" /> Yape Automático
            </div>
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-2 border border-[#333]">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Servidores 128 Tick
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-[#111] p-3 border border-[#222]">
        {/* Categories */}
        <div className="flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-mono text-neutral-400 uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Categorías:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#FF5500] text-white border border-[#FF5500]'
                  : 'bg-[#1C1C1C] text-neutral-400 border border-[#2D2D2D] hover:text-white hover:border-neutral-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos o servicios..."
            className="w-full bg-[#181818] border border-[#333] pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5500] font-mono"
          />
        </div>
      </div>

      {/* Product Grid (Cumplimiento Culqi: Mínimo 5 productos con foto, descripción y precio) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div
            key={product.id}
            className="bg-[#121212] border-2 border-[#242424] hover:border-[#FF5500]/60 transition-all flex flex-col justify-between shadow-xl group"
          >
            <div>
              {/* Product Image */}
              <div className="relative h-48 w-full overflow-hidden bg-[#181818]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-80" />

                {/* Badge */}
                {product.badge && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#FF5500] text-black text-[10px] font-mono font-black uppercase tracking-wider shadow-md">
                    {product.badge}
                  </span>
                )}

                <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/70 backdrop-blur-sm border border-neutral-700 text-neutral-300 text-[10px] font-mono uppercase">
                  {product.category}
                </span>

                {/* Price Tag Overlay */}
                <div className="absolute bottom-3 left-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black italic tracking-tighter text-white font-mono drop-shadow-md">
                    S/ {product.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400 uppercase font-mono">
                    PEN (IGV Inc.)
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5">
                <h3 className="text-base font-black uppercase text-white tracking-tight mb-2 group-hover:text-[#FF5500] transition-colors">
                  {product.name}
                </h3>
                
                <p className="text-neutral-400 text-xs leading-relaxed mb-4">
                  {product.description}
                </p>

                {/* Feature List */}
                <div className="border-t border-[#222] pt-3 mb-2 space-y-1.5">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase font-bold block mb-1">
                    Lo que incluye:
                  </span>
                  {product.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-neutral-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons (Cumplimiento Culqi: Carrito y Botón de Comprar) */}
            <div className="p-5 pt-0 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="py-2.5 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#333] hover:border-neutral-400 text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Añadir al carrito para seguir comprando"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>+ Carrito</span>
              </button>

              <button
                type="button"
                onClick={() => onBuyNow(product)}
                className="py-2.5 px-3 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white text-xs font-mono font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF5500]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                title="Comprar inmediatamente con Culqi o Yape"
              >
                <span>Comprar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-[#121212] border border-[#222]">
          <p className="text-neutral-400 font-mono text-sm">No se encontraron productos con ese criterio de búsqueda.</p>
        </div>
      )}
    </div>
  );
};
