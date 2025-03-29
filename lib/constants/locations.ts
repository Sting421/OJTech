export const countries = [
  "Philippines",
  "Malaysia",
  "Singapore",
  "Indonesia",
  "Thailand",
  "Vietnam",
] as const;

export const philippineRegions = [
  "National Capital Region (NCR)",
  "Cordillera Administrative Region (CAR)",
  "Ilocos Region (Region I)",
  "Cagayan Valley (Region II)",
  "Central Luzon (Region III)",
  "CALABARZON (Region IV-A)",
  "MIMAROPA (Region IV-B)",
  "Bicol Region (Region V)",
  "Western Visayas (Region VI)",
  "Central Visayas (Region VII)",
  "Eastern Visayas (Region VIII)",
  "Zamboanga Peninsula (Region IX)",
  "Northern Mindanao (Region X)",
  "Davao Region (Region XI)",
  "SOCCSKSARGEN (Region XII)",
  "Caraga (Region XIII)",
  "Bangsamoro (BARMM)",
] as const;

export const philippineCities = {
  "National Capital Region (NCR)": [
    "Manila",
    "Quezon City",
    "Makati",
    "Taguig",
    "Pasig",
    "Parañaque",
    "Pasay",
    "Caloocan",
    "Mandaluyong",
    "San Juan",
    "Marikina",
    "Muntinlupa",
    "Las Piñas",
    "Valenzuela",
    "Navotas",
    "Malabon",
    "Pateros",
  ],
} as const;

// Sample postal codes for NCR cities
export const philippinePostalCodes = {
  "Manila": ["1000", "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008"],
  "Quezon City": ["1100", "1101", "1102", "1103", "1104", "1105", "1106", "1107", "1108"],
  "Makati": ["1200", "1201", "1202", "1203", "1204", "1205", "1206", "1207", "1208"],
  "Taguig": ["1630", "1631", "1632", "1633", "1634", "1635", "1636", "1637", "1638"],
} as const;
