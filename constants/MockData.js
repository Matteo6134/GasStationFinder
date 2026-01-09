export const MOCK_STATIONS = [
  { 
    id: 1, title: "Eni Station", brand: 'eni',
    latOffset: 0.002, lngOffset: 0.001, address: "Via del Futuro, 12",
    prices: { unleaded: 1.789, diesel: 1.659, gpl: 0.789, electric: 0.45 } 
  },
  { 
    id: 2, title: "Esso Express", brand: 'esso',
    latOffset: -0.003, lngOffset: -0.002, address: "Viale Apple, 45",
    prices: { unleaded: 1.819, diesel: 1.689, gpl: null, electric: null } 
  },
  { 
    id: 3, title: "Tesla Supercharger", brand: 'tesla',
    latOffset: 0.004, lngOffset: 0.002, address: "Parco Tecnologico",
    prices: { unleaded: null, diesel: null, gpl: null, electric: 0.38 } 
  }
];