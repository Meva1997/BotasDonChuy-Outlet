export interface MockProduct {
  id: number;
  name: string;
  description?: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  type: string;
  sizes: number[];
  imageSrc?: string;
  code?: string | null;
  // Dimensiones del paquete — requeridas por la API de Skydropx para cotizar envíos.
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 1,
    name: "Bota Ranchera 1972",
    description:
      "Piel de res curtida al vegetal, horma tradicional de Saltillo. Costura a mano del taller original — el último lote antes de cerrar la línea.",
    originalPrice: 4800,
    salePrice: 1920,
    discountPercent: 60,
    stock: 4,
    type: "bota",
    sizes: [25, 26, 27, 28],
    code: "jeh3ujlkh",
    weightKg: 2.5,
    lengthCm: 35,
    widthCm: 30,
    heightCm: 20,
  },
  {
    id: 2,
    name: "Bota Exótica de Avestruz",
    description:
      "Piel de avestruz genuina con acabado natural. Corte artesanal de edición limitada — piezas únicas de colección.",
    originalPrice: 7200,
    salePrice: 2880,
    discountPercent: 60,
    stock: 3,
    type: "bota",
    sizes: [24, 26, 28],
    weightKg: 2.5,
    lengthCm: 35,
    widthCm: 30,
    heightCm: 20,
  },
  {
    id: 3,
    name: "Sombrero Llanero 30X",
    description:
      "Fieltro prensado de 30X con ala ancha y copa alta. Forma clásica norteña, acabado interior en tela de seda natural.",
    originalPrice: 3400,
    salePrice: 1530,
    discountPercent: 55,
    stock: 3,
    type: "sombrero",
    sizes: [56, 58, 60],
    weightKg: 0.8,
    lengthCm: 45,
    widthCm: 45,
    heightCm: 20,
  },
  {
    id: 4,
    name: "Bota Piel de Víbora",
    description:
      "Piel de víbora de cascabel con horma vaquera. Suela de cuero doble cosida — resistencia y estilo en cada paso.",
    originalPrice: 5600,
    salePrice: 2240,
    discountPercent: 60,
    stock: 2,
    type: "bota",
    sizes: [25, 27],
    code: "3hk3hllf",
    weightKg: 2.5,
    lengthCm: 35,
    widthCm: 30,
    heightCm: 20,
  },
  {
    id: 5,
    name: "Sombrero Norteño Pelo de Camello",
    description:
      "Pelo de camello natural con acabado cepillado. Ala recta tradicional, cinta de piel cosida a mano.",
    originalPrice: 2800,
    salePrice: 1400,
    discountPercent: 50,
    stock: 1,
    type: "sombrero",
    sizes: [58],
    weightKg: 0.8,
    lengthCm: 45,
    widthCm: 45,
    heightCm: 20,
  },
  {
    id: 6,
    name: "Bota Bordada Tejana",
    description:
      "Piel de res con bordado floral tejano en hilo de seda. Puntera cuadrada, tacón cubano de madera lacada.",
    originalPrice: 3900,
    salePrice: 1755,
    discountPercent: 55,
    stock: 4,
    type: "bota",
    sizes: [24, 25, 26, 27],
    weightKg: 2.5,
    lengthCm: 35,
    widthCm: 30,
    heightCm: 20,
  },
];
