export interface MockProduct {
  id: number;
  name: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  type: string;
  sizes: number[];
  code?: string | null;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 1,
    name: "Bota Ranchera 1972",
    originalPrice: 4800,
    salePrice: 1920,
    discountPercent: 60,
    stock: 2,
    type: "bota",
    sizes: [25, 26, 27, 28],
    code: "jeh3ujlkh",
  },
  {
    id: 2,
    name: "Bota Exótica de Avestruz",
    originalPrice: 7200,
    salePrice: 2880,
    discountPercent: 60,
    stock: 1,
    type: "bota",
    sizes: [24, 26, 28],
  },
  {
    id: 3,
    name: "Sombrero Llanero 30X",
    originalPrice: 3400,
    salePrice: 1530,
    discountPercent: 55,
    stock: 3,
    type: "sombrero",
    sizes: [56, 58, 60],
  },
  {
    id: 4,
    name: "Bota Piel de Víbora",
    originalPrice: 5600,
    salePrice: 2240,
    discountPercent: 60,
    stock: 1,
    type: "bota",
    sizes: [25, 27],
    code: "3hk3hllf",
  },
  {
    id: 5,
    name: "Sombrero Norteño Pelo de Camello",
    originalPrice: 2800,
    salePrice: 1400,
    discountPercent: 50,
    stock: 1,
    type: "sombrero",
    sizes: [58, 60],
  },
  {
    id: 6,
    name: "Bota Bordada Tejana",
    originalPrice: 3900,
    salePrice: 1755,
    discountPercent: 55,
    stock: 4,
    type: "bota",
    sizes: [24, 25, 26, 27],
  },
];
