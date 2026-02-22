/**
 * Complete World Currencies Library
 *
 * Each currency has:
 *   code     - ISO 4217 currency code
 *   name     - Full currency name
 *   symbol   - Currency symbol
 *   flag     - Country flag emoji (primary country)
 *   decimals - Number of decimal places
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  decimals: number;
}

export const currencies: Currency[] = [
  // ── Major / G10 Currencies ──────────────────────────────────
  { code: "USD", name: "US Dollar", symbol: "$", flag: "\u{1F1FA}\u{1F1F8}", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "\u20AC", flag: "\u{1F1EA}\u{1F1FA}", decimals: 2 },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", flag: "\u{1F1EC}\u{1F1E7}", decimals: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5", flag: "\u{1F1EF}\u{1F1F5}", decimals: 0 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "\u{1F1E8}\u{1F1ED}", decimals: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "\u{1F1E8}\u{1F1E6}", decimals: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "\u{1F1E6}\u{1F1FA}", decimals: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "\u{1F1F3}\u{1F1FF}", decimals: 2 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "\u{1F1F8}\u{1F1EA}", decimals: 2 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "\u{1F1F3}\u{1F1F4}", decimals: 2 },

  // ── Asia & Pacific ──────────────────────────────────────────
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5", flag: "\u{1F1E8}\u{1F1F3}", decimals: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "\u{1F1ED}\u{1F1F0}", decimals: 2 },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", flag: "\u{1F1F9}\u{1F1FC}", decimals: 2 },
  { code: "KRW", name: "South Korean Won", symbol: "\u20A9", flag: "\u{1F1F0}\u{1F1F7}", decimals: 0 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "\u{1F1F8}\u{1F1EC}", decimals: 2 },
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9", flag: "\u{1F1EE}\u{1F1F3}", decimals: 2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "\u{1F1EE}\u{1F1E9}", decimals: 0 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "\u{1F1F2}\u{1F1FE}", decimals: 2 },
  { code: "THB", name: "Thai Baht", symbol: "\u0E3F", flag: "\u{1F1F9}\u{1F1ED}", decimals: 2 },
  { code: "PHP", name: "Philippine Peso", symbol: "\u20B1", flag: "\u{1F1F5}\u{1F1ED}", decimals: 2 },
  { code: "VND", name: "Vietnamese Dong", symbol: "\u20AB", flag: "\u{1F1FB}\u{1F1F3}", decimals: 0 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "\u20A8", flag: "\u{1F1F5}\u{1F1F0}", decimals: 2 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "\u09F3", flag: "\u{1F1E7}\u{1F1E9}", decimals: 2 },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "\u20A8", flag: "\u{1F1F1}\u{1F1F0}", decimals: 2 },
  { code: "NPR", name: "Nepalese Rupee", symbol: "\u20A8", flag: "\u{1F1F3}\u{1F1F5}", decimals: 2 },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K", flag: "\u{1F1F2}\u{1F1F2}", decimals: 0 },
  { code: "KHR", name: "Cambodian Riel", symbol: "\u17DB", flag: "\u{1F1F0}\u{1F1ED}", decimals: 2 },
  { code: "LAK", name: "Lao Kip", symbol: "\u20AD", flag: "\u{1F1F1}\u{1F1E6}", decimals: 0 },
  { code: "BND", name: "Brunei Dollar", symbol: "B$", flag: "\u{1F1E7}\u{1F1F3}", decimals: 2 },
  { code: "MNT", name: "Mongolian Tugrik", symbol: "\u20AE", flag: "\u{1F1F2}\u{1F1F3}", decimals: 2 },
  { code: "KPW", name: "North Korean Won", symbol: "\u20A9", flag: "\u{1F1F0}\u{1F1F5}", decimals: 2 },
  { code: "FJD", name: "Fijian Dollar", symbol: "FJ$", flag: "\u{1F1EB}\u{1F1EF}", decimals: 2 },
  { code: "PGK", name: "Papua New Guinean Kina", symbol: "K", flag: "\u{1F1F5}\u{1F1EC}", decimals: 2 },
  { code: "WST", name: "Samoan Tala", symbol: "T", flag: "\u{1F1FC}\u{1F1F8}", decimals: 2 },
  { code: "TOP", name: "Tongan Pa\u02BBanga", symbol: "T$", flag: "\u{1F1F9}\u{1F1F4}", decimals: 2 },
  { code: "VUV", name: "Vanuatu Vatu", symbol: "VT", flag: "\u{1F1FB}\u{1F1FA}", decimals: 0 },
  { code: "SBD", name: "Solomon Islands Dollar", symbol: "SI$", flag: "\u{1F1F8}\u{1F1E7}", decimals: 2 },
  { code: "MVR", name: "Maldivian Rufiyaa", symbol: "Rf", flag: "\u{1F1F2}\u{1F1FB}", decimals: 2 },
  { code: "BTN", name: "Bhutanese Ngultrum", symbol: "Nu", flag: "\u{1F1E7}\u{1F1F9}", decimals: 2 },
  { code: "AFN", name: "Afghan Afghani", symbol: "\u060B", flag: "\u{1F1E6}\u{1F1EB}", decimals: 2 },
  { code: "MOP", name: "Macanese Pataca", symbol: "MOP$", flag: "\u{1F1F2}\u{1F1F4}", decimals: 2 },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "\u20B8", flag: "\u{1F1F0}\u{1F1FF}", decimals: 2 },
  { code: "UZS", name: "Uzbekistani Som", symbol: "\u0441\u045E\u043C", flag: "\u{1F1FA}\u{1F1FF}", decimals: 2 },
  { code: "KGS", name: "Kyrgyzstani Som", symbol: "\u0441\u043E\u043C", flag: "\u{1F1F0}\u{1F1EC}", decimals: 2 },
  { code: "TJS", name: "Tajikistani Somoni", symbol: "SM", flag: "\u{1F1F9}\u{1F1EF}", decimals: 2 },
  { code: "TMT", name: "Turkmenistani Manat", symbol: "T", flag: "\u{1F1F9}\u{1F1F2}", decimals: 2 },

  // ── Middle East ─────────────────────────────────────────────
  { code: "AED", name: "UAE Dirham", symbol: "\u062F.\u0625", flag: "\u{1F1E6}\u{1F1EA}", decimals: 2 },
  { code: "SAR", name: "Saudi Riyal", symbol: "\uFDFC", flag: "\u{1F1F8}\u{1F1E6}", decimals: 2 },
  { code: "QAR", name: "Qatari Riyal", symbol: "\uFDFC", flag: "\u{1F1F6}\u{1F1E6}", decimals: 2 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "\u062F.\u0643", flag: "\u{1F1F0}\u{1F1FC}", decimals: 3 },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", flag: "\u{1F1E7}\u{1F1ED}", decimals: 3 },
  { code: "OMR", name: "Omani Rial", symbol: "\uFDFC", flag: "\u{1F1F4}\u{1F1F2}", decimals: 3 },
  { code: "JOD", name: "Jordanian Dinar", symbol: "JD", flag: "\u{1F1EF}\u{1F1F4}", decimals: 3 },
  { code: "ILS", name: "Israeli Shekel", symbol: "\u20AA", flag: "\u{1F1EE}\u{1F1F1}", decimals: 2 },
  { code: "IQD", name: "Iraqi Dinar", symbol: "\u0639.\u062F", flag: "\u{1F1EE}\u{1F1F6}", decimals: 3 },
  { code: "IRR", name: "Iranian Rial", symbol: "\uFDFC", flag: "\u{1F1EE}\u{1F1F7}", decimals: 2 },
  { code: "LBP", name: "Lebanese Pound", symbol: "\u0644.\u0644", flag: "\u{1F1F1}\u{1F1E7}", decimals: 2 },
  { code: "SYP", name: "Syrian Pound", symbol: "\u00A3S", flag: "\u{1F1F8}\u{1F1FE}", decimals: 2 },
  { code: "YER", name: "Yemeni Rial", symbol: "\uFDFC", flag: "\u{1F1FE}\u{1F1EA}", decimals: 2 },

  // ── Europe (non-Euro) ──────────────────────────────────────
  { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "\u{1F1E9}\u{1F1F0}", decimals: 2 },
  { code: "ISK", name: "Icelandic Kr\u00F3na", symbol: "kr", flag: "\u{1F1EE}\u{1F1F8}", decimals: 0 },
  { code: "PLN", name: "Polish Zloty", symbol: "z\u0142", flag: "\u{1F1F5}\u{1F1F1}", decimals: 2 },
  { code: "CZK", name: "Czech Koruna", symbol: "K\u010D", flag: "\u{1F1E8}\u{1F1FF}", decimals: 2 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", flag: "\u{1F1ED}\u{1F1FA}", decimals: 2 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", flag: "\u{1F1F7}\u{1F1F4}", decimals: 2 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "\u043B\u0432", flag: "\u{1F1E7}\u{1F1EC}", decimals: 2 },
  { code: "RSD", name: "Serbian Dinar", symbol: "din", flag: "\u{1F1F7}\u{1F1F8}", decimals: 2 },
  { code: "HRK", name: "Croatian Kuna", symbol: "kn", flag: "\u{1F1ED}\u{1F1F7}", decimals: 2 },
  { code: "BAM", name: "Bosnia-Herzegovina Mark", symbol: "KM", flag: "\u{1F1E7}\u{1F1E6}", decimals: 2 },
  { code: "MKD", name: "Macedonian Denar", symbol: "\u0434\u0435\u043D", flag: "\u{1F1F2}\u{1F1F0}", decimals: 2 },
  { code: "ALL", name: "Albanian Lek", symbol: "L", flag: "\u{1F1E6}\u{1F1F1}", decimals: 2 },
  { code: "MDL", name: "Moldovan Leu", symbol: "L", flag: "\u{1F1F2}\u{1F1E9}", decimals: 2 },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "\u20B4", flag: "\u{1F1FA}\u{1F1E6}", decimals: 2 },
  { code: "RUB", name: "Russian Ruble", symbol: "\u20BD", flag: "\u{1F1F7}\u{1F1FA}", decimals: 2 },
  { code: "BYN", name: "Belarusian Ruble", symbol: "Br", flag: "\u{1F1E7}\u{1F1FE}", decimals: 2 },
  { code: "GEL", name: "Georgian Lari", symbol: "\u20BE", flag: "\u{1F1EC}\u{1F1EA}", decimals: 2 },
  { code: "AMD", name: "Armenian Dram", symbol: "\u058F", flag: "\u{1F1E6}\u{1F1F2}", decimals: 2 },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "\u20BC", flag: "\u{1F1E6}\u{1F1FF}", decimals: 2 },
  { code: "TRY", name: "Turkish Lira", symbol: "\u20BA", flag: "\u{1F1F9}\u{1F1F7}", decimals: 2 },

  // ── Africa ──────────────────────────────────────────────────
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "\u{1F1FF}\u{1F1E6}", decimals: 2 },
  { code: "NGN", name: "Nigerian Naira", symbol: "\u20A6", flag: "\u{1F1F3}\u{1F1EC}", decimals: 2 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E\u00A3", flag: "\u{1F1EA}\u{1F1EC}", decimals: 2 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "\u{1F1F0}\u{1F1EA}", decimals: 2 },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH\u20B5", flag: "\u{1F1EC}\u{1F1ED}", decimals: 2 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "\u{1F1F9}\u{1F1FF}", decimals: 2 },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "\u{1F1FA}\u{1F1EC}", decimals: 0 },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", flag: "\u{1F1EA}\u{1F1F9}", decimals: 2 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD", flag: "\u{1F1F2}\u{1F1E6}", decimals: 2 },
  { code: "TND", name: "Tunisian Dinar", symbol: "DT", flag: "\u{1F1F9}\u{1F1F3}", decimals: 3 },
  { code: "DZD", name: "Algerian Dinar", symbol: "\u062F.\u062C", flag: "\u{1F1E9}\u{1F1FF}", decimals: 2 },
  { code: "LYD", name: "Libyan Dinar", symbol: "LD", flag: "\u{1F1F1}\u{1F1FE}", decimals: 3 },
  { code: "SDG", name: "Sudanese Pound", symbol: "\u00A3SD", flag: "\u{1F1F8}\u{1F1E9}", decimals: 2 },
  { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", flag: "\u{1F1E6}\u{1F1F4}", decimals: 2 },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", flag: "\u{1F1F8}\u{1F1F3}", decimals: 0 },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", flag: "\u{1F1E8}\u{1F1F2}", decimals: 0 },
  { code: "MZN", name: "Mozambican Metical", symbol: "MT", flag: "\u{1F1F2}\u{1F1FF}", decimals: 2 },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", flag: "\u{1F1FF}\u{1F1F2}", decimals: 2 },
  { code: "MWK", name: "Malawian Kwacha", symbol: "MK", flag: "\u{1F1F2}\u{1F1FC}", decimals: 2 },
  { code: "BWP", name: "Botswana Pula", symbol: "P", flag: "\u{1F1E7}\u{1F1FC}", decimals: 2 },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$", flag: "\u{1F1F3}\u{1F1E6}", decimals: 2 },
  { code: "SZL", name: "Swazi Lilangeni", symbol: "E", flag: "\u{1F1F8}\u{1F1FF}", decimals: 2 },
  { code: "LSL", name: "Lesotho Loti", symbol: "L", flag: "\u{1F1F1}\u{1F1F8}", decimals: 2 },
  { code: "MGA", name: "Malagasy Ariary", symbol: "Ar", flag: "\u{1F1F2}\u{1F1EC}", decimals: 2 },
  { code: "MUR", name: "Mauritian Rupee", symbol: "\u20A8", flag: "\u{1F1F2}\u{1F1FA}", decimals: 2 },
  { code: "SCR", name: "Seychellois Rupee", symbol: "\u20A8", flag: "\u{1F1F8}\u{1F1E8}", decimals: 2 },
  { code: "RWF", name: "Rwandan Franc", symbol: "RF", flag: "\u{1F1F7}\u{1F1FC}", decimals: 0 },
  { code: "BIF", name: "Burundian Franc", symbol: "FBu", flag: "\u{1F1E7}\u{1F1EE}", decimals: 0 },
  { code: "DJF", name: "Djiboutian Franc", symbol: "Fdj", flag: "\u{1F1E9}\u{1F1EF}", decimals: 0 },
  { code: "ERN", name: "Eritrean Nakfa", symbol: "Nfk", flag: "\u{1F1EA}\u{1F1F7}", decimals: 2 },
  { code: "SOS", name: "Somali Shilling", symbol: "Sh", flag: "\u{1F1F8}\u{1F1F4}", decimals: 2 },
  { code: "CDF", name: "Congolese Franc", symbol: "FC", flag: "\u{1F1E8}\u{1F1E9}", decimals: 2 },
  { code: "GMD", name: "Gambian Dalasi", symbol: "D", flag: "\u{1F1EC}\u{1F1F2}", decimals: 2 },
  { code: "GNF", name: "Guinean Franc", symbol: "FG", flag: "\u{1F1EC}\u{1F1F3}", decimals: 0 },
  { code: "SLL", name: "Sierra Leonean Leone", symbol: "Le", flag: "\u{1F1F8}\u{1F1F1}", decimals: 2 },
  { code: "LRD", name: "Liberian Dollar", symbol: "L$", flag: "\u{1F1F1}\u{1F1F7}", decimals: 2 },
  { code: "CVE", name: "Cape Verdean Escudo", symbol: "$", flag: "\u{1F1E8}\u{1F1FB}", decimals: 2 },
  { code: "STN", name: "S\u00E3o Tom\u00E9 Dobra", symbol: "Db", flag: "\u{1F1F8}\u{1F1F9}", decimals: 2 },
  { code: "KMF", name: "Comorian Franc", symbol: "CF", flag: "\u{1F1F0}\u{1F1F2}", decimals: 0 },
  { code: "SSP", name: "South Sudanese Pound", symbol: "\u00A3", flag: "\u{1F1F8}\u{1F1F8}", decimals: 2 },
  { code: "MRU", name: "Mauritanian Ouguiya", symbol: "UM", flag: "\u{1F1F2}\u{1F1F7}", decimals: 2 },
  { code: "ZWL", name: "Zimbabwean Dollar", symbol: "Z$", flag: "\u{1F1FF}\u{1F1FC}", decimals: 2 },

  // ── Americas ────────────────────────────────────────────────
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "\u{1F1E7}\u{1F1F7}", decimals: 2 },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", flag: "\u{1F1F2}\u{1F1FD}", decimals: 2 },
  { code: "ARS", name: "Argentine Peso", symbol: "AR$", flag: "\u{1F1E6}\u{1F1F7}", decimals: 2 },
  { code: "CLP", name: "Chilean Peso", symbol: "CL$", flag: "\u{1F1E8}\u{1F1F1}", decimals: 0 },
  { code: "COP", name: "Colombian Peso", symbol: "CO$", flag: "\u{1F1E8}\u{1F1F4}", decimals: 2 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", flag: "\u{1F1F5}\u{1F1EA}", decimals: 2 },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", flag: "\u{1F1FA}\u{1F1FE}", decimals: 2 },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "\u20B2", flag: "\u{1F1F5}\u{1F1FE}", decimals: 0 },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs", flag: "\u{1F1E7}\u{1F1F4}", decimals: 2 },
  { code: "VES", name: "Venezuelan Bol\u00EDvar", symbol: "Bs.S", flag: "\u{1F1FB}\u{1F1EA}", decimals: 2 },
  { code: "GYD", name: "Guyanese Dollar", symbol: "GY$", flag: "\u{1F1EC}\u{1F1FE}", decimals: 2 },
  { code: "SRD", name: "Surinamese Dollar", symbol: "SR$", flag: "\u{1F1F8}\u{1F1F7}", decimals: 2 },
  { code: "FKP", name: "Falkland Islands Pound", symbol: "\u00A3", flag: "\u{1F1EB}\u{1F1F0}", decimals: 2 },
  { code: "CRC", name: "Costa Rican Col\u00F3n", symbol: "\u20A1", flag: "\u{1F1E8}\u{1F1F7}", decimals: 2 },
  { code: "PAB", name: "Panamanian Balboa", symbol: "B/.", flag: "\u{1F1F5}\u{1F1E6}", decimals: 2 },
  { code: "DOP", name: "Dominican Peso", symbol: "RD$", flag: "\u{1F1E9}\u{1F1F4}", decimals: 2 },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q", flag: "\u{1F1EC}\u{1F1F9}", decimals: 2 },
  { code: "HNL", name: "Honduran Lempira", symbol: "L", flag: "\u{1F1ED}\u{1F1F3}", decimals: 2 },
  { code: "NIO", name: "Nicaraguan C\u00F3rdoba", symbol: "C$", flag: "\u{1F1F3}\u{1F1EE}", decimals: 2 },
  { code: "SVC", name: "Salvadoran Col\u00F3n", symbol: "\u20A1", flag: "\u{1F1F8}\u{1F1FB}", decimals: 2 },
  { code: "BZD", name: "Belize Dollar", symbol: "BZ$", flag: "\u{1F1E7}\u{1F1FF}", decimals: 2 },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$", flag: "\u{1F1EF}\u{1F1F2}", decimals: 2 },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$", flag: "\u{1F1F9}\u{1F1F9}", decimals: 2 },
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", flag: "\u{1F1E7}\u{1F1E7}", decimals: 2 },
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$", flag: "\u{1F1E7}\u{1F1F8}", decimals: 2 },
  { code: "BMD", name: "Bermudian Dollar", symbol: "BD$", flag: "\u{1F1E7}\u{1F1F2}", decimals: 2 },
  { code: "KYD", name: "Cayman Islands Dollar", symbol: "CI$", flag: "\u{1F1F0}\u{1F1FE}", decimals: 2 },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", flag: "\u{1F1E6}\u{1F1EC}", decimals: 2 },
  { code: "HTG", name: "Haitian Gourde", symbol: "G", flag: "\u{1F1ED}\u{1F1F9}", decimals: 2 },
  { code: "CUP", name: "Cuban Peso", symbol: "\u20B1", flag: "\u{1F1E8}\u{1F1FA}", decimals: 2 },
  { code: "AWG", name: "Aruban Florin", symbol: "\u0192", flag: "\u{1F1E6}\u{1F1FC}", decimals: 2 },
  { code: "ANG", name: "Netherlands Antillean Guilder", symbol: "\u0192", flag: "\u{1F1E8}\u{1F1FC}", decimals: 2 },

  // ── Crypto (common ones) ────────────────────────────────────
  { code: "BTC", name: "Bitcoin", symbol: "\u20BF", flag: "\u{1FA99}", decimals: 8 },
  { code: "ETH", name: "Ethereum", symbol: "\u039E", flag: "\u{1FA99}", decimals: 18 },
  { code: "USDT", name: "Tether", symbol: "\u20AE", flag: "\u{1FA99}", decimals: 6 },
  { code: "USDC", name: "USD Coin", symbol: "USDC", flag: "\u{1FA99}", decimals: 6 },

  // ── Precious Metals (ISO 4217) ──────────────────────────────
  { code: "XAU", name: "Gold (troy oz)", symbol: "XAU", flag: "\u{1F947}", decimals: 2 },
  { code: "XAG", name: "Silver (troy oz)", symbol: "XAG", flag: "\u{1F948}", decimals: 2 },
  { code: "XPT", name: "Platinum (troy oz)", symbol: "XPT", flag: "\u2B1C", decimals: 2 },
  { code: "XPD", name: "Palladium (troy oz)", symbol: "XPD", flag: "\u2B1C", decimals: 2 },
];

/** Get currency by ISO code */
export const getCurrency = (code: string): Currency | undefined =>
  currencies.find((c) => c.code === code.toUpperCase());

/** Search currencies by code or name */
export const searchCurrencies = (query: string): Currency[] => {
  const q = query.toLowerCase();
  return currencies.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q),
  );
};

export default currencies;
