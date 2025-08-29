const fs = require('fs');

// Wczytaj pliki z kategoriami
const ovokoCategories = JSON.parse(fs.readFileSync('ovoko_categories_cleaned.json', 'utf8'));
const baselinkerCategories = JSON.parse(fs.readFileSync('baselinker_categories.json', 'utf8'));

// Słownik kluczowych słów i ich mapowań
const keywordMapping = {
    // Układ hamulcowy
    'hamulcowy': ['42', '43', '45', '46', '48', '49', '50', '51', '52', '54', '55', '56', '62', '65', '66', '69', '72', '75', '80', '552', '553', '554', '1186', '1187', '1188', '1441', '1442', '1584', '1585', '1654', '1999', '2017'],
    'hamulca': ['42', '43', '45', '46', '48', '49', '50', '51', '52', '54', '55', '56', '62', '65', '66', '69', '72', '75', '80', '552', '553', '554', '1186', '1187', '1188', '1441', '1442', '1584', '1585', '1654', '1999', '2017'],
    'hamulcowe': ['42', '43', '45', '46', '48', '49', '50', '51', '52', '54', '55', '56', '62', '65', '66', '69', '72', '75', '80', '552', '553', '554', '1186', '1187', '1188', '1441', '1442', '1584', '1585', '1654', '1999', '2017'],
    'tarcza': ['552', '553', '554'],
    'zacisk': ['75', '553', '1188'],
    'klocki': ['66', '1187'],
    
    // Układ elektryczny
    'alternator': ['252'],
    'rozrusznik': ['259'],
    'czujnik': ['1201', '1002', '1003', '1007', '1012', '1013', '1385', '1466', '1468', '1471', '1545', '1560', '1570', '1624', '1660', '1662', '1727', '1732', '1819', '1844', '1865', '1981', '2008', '2069'],
    'sterownik': ['1133', '1134', '1135', '1136', '1137', '1138', '1139', '1140', '1141', '1142', '1143', '1144', '1145', '1146', '1147', '1148', '1149', '1150', '1151', '1152', '1153', '1154', '1155', '1156', '1157', '1158', '1159', '1160', '1161', '1162', '1163'],
    'moduł': ['1133', '1134', '1135', '1136', '1137', '1138', '1139', '1140', '1141', '1142', '1143', '1144', '1145', '1146', '1147', '1148', '1149', '1150', '1151', '1152', '1153', '1154', '1155', '1156', '1157', '1158', '1159', '1160', '1161', '1162', '1163'],
    
    // Karoseria
    'drzwi': ['754', '586', '606', '775'],
    'zderzak': ['504', '543'],
    'błotnik': ['531', '805'],
    'maski': ['519'],
    'klapy': ['556'],
    'bagażnika': ['556', '570', '571', '572', '573', '574'],
    'progi': ['1210'],
    'dachy': ['1097'],
    'relingi': ['1509'],
    
    // Silnik
    'silnik': ['322', '323'],
    'silniki': ['322', '323'],
    'silnika': ['322', '323'],
    'egr': ['1175', '1176', '1177', '1178', '1197'],
    'turbina': ['278'],
    'sprężarka': ['279'],
    
    // Układ chłodzenia
    'chłodnica': ['231', '1916'],
    'wentylator': ['233', '237', '238', '247', '248'],
    'termostat': ['218', '1917', '1918'],
    
    // Układ paliwowy
    'paliwa': ['302', '303', '304', '305', '306', '307', '308', '309', '310', '311', '312'],
    'wtryskiwacz': ['320', '321'],
    'pompa': ['311', '312', '316', '317'],
    
    // Układ zawieszenia
    'zawieszenia': ['348', '349', '350', '353', '354', '355', '356', '359', '362', '363', '364', '367', '368', '369', '370', '377', '378', '381', '384', '385', '386', '387', '388', '389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '403'],
    'amortyzator': ['350', '384'],
    'sprężyna': ['363', '393'],
    'wahacz': ['369', '370', '378', '398', '403', '1653'],
    
    // Oświetlenie
    'lampa': ['136', '139', '143', '146', '149', '151', '152', '155', '158', '161', '164', '165', '166', '169', '170', '172', '173', '176', '177', '178', '179', '181', '184', '187', '191', '192', '193', '194', '195'],
    'lampy': ['136', '139', '143', '146', '149', '151', '152', '155', '158', '161', '164', '165', '166', '169', '170', '172', '173', '176', '177', '178', '179', '181', '184', '187', '191', '192', '193', '194', '195'],
    'światło': ['164', '165', '166', '172', '173', '176', '177', '178', '179', '181', '184', '187', '191', '192', '193', '194', '195'],
    'żarówka': ['149', '169', '1747'],
    
    // Wyposażenie wnętrza
    'fotele': ['993', '994', '995', '996', '997', '998'],
    'fotel': ['993', '994', '995', '996', '997', '998'],
    'deska': ['808', '816'],
    'schowek': ['812', '830', '831', '832', '833', '834', '835'],
    'zagłówki': ['1825', '1826', '1837'],
    
    // Układ napędowy
    'skrzynia': ['418', '419', '420', '421', '422', '462'],
    'skrzyni': ['418', '419', '420', '421', '422', '462'],
    'sprzęgło': ['427', '428', '429', '430', '431', '432', '433', '436', '437', '438'],
    'wały': ['443', '444', '450', '451', '454'],
    'przegub': ['447', '448', '449', '1357', '1358', '1643', '1644'],
    
    // Opony i felgi
    'opony': ['471', '472', '494', '495', '690', '691', '692', '693', '694', '695', '696', '711', '712', '713', '714', '715', '716', '717', '718', '719', '720', '721', '722', '723', '724', '725', '726', '727', '728', '729', '730', '731', '732', '697', '698', '699', '700', '701', '702', '703', '704', '705', '706', '707', '708', '709', '710', '733', '734', '735', '736', '737', '738', '739'],
    'felgi': ['647', '648', '649', '650', '651', '652', '653', '654', '655', '656', '657', '671', '672', '673', '674', '675', '676', '677', '678', '679', '680', '681', '468', '491', '492', '493', '682', '683', '684', '685', '686', '687', '688', '1885', '1886', '637', '638', '639', '641', '642', '643', '664', '665', '666', '667', '668', '669', '2119', '2120', '2121', '658', '659', '660', '661', '662', '663', '2116', '2117', '2118'],
    
    // Układ klimatyzacji
    'klimatyzacja': ['199', '200', '201', '202', '203', '204', '205', '206', '207', '249'],
    'klimatyzacji': ['199', '200', '201', '202', '203', '204', '205', '206', '207', '249'],
    
    // Układ kierowniczy
    'kierowniczy': ['332', '333', '334', '335', '336', '337', '339', '340', '341', '342', '343', '346'],
    'kierownicy': ['332', '333', '334', '335', '336', '337', '339', '340', '341', '342', '343', '346'],
    
    // Układ wydechowy
    'wydechowy': ['1329', '1330', '1331', '1332', '1333', '1334'],
    'tłumik': ['1329', '1330', '1331', '1332', '1333', '1334'],
    'tłumiki': ['1329', '1330', '1331', '1332', '1333', '1334'],
    
    // Układ zapłonowy
    'zapłonowy': ['1300', '1301', '1302', '1458', '1465', '1469', '1470', '1507'],
    'zapłonu': ['1300', '1301', '1302', '1458', '1465', '1469', '1470', '1507'],
    'świeca': ['1301', '1302'],
    'świece': ['1301', '1302'],
    
    // Układ audio
    'głośnik': ['1280', '1281', '1283', '1335', '1336', '1411', '1548', '1564', '1676', '1870', '1893', '1965', '2100'],
    'głośniki': ['1280', '1281', '1283', '1335', '1336', '1411', '1548', '1564', '1676', '1870', '1893', '1965', '2100'],
    'radio': ['1277', '1278', '1279', '1280', '1281', '1283', '1335', '1336', '1338', '1411', '1548', '1564', '1676', '1870', '1893', '1965', '2100'],
    
    // Układ bezpieczeństwa
    'airbag': ['891', '892', '893', '894', '895', '896', '897', '904', '905'],
    'pasy': ['898', '899', '900', '901', '902', '903', '1604', '1806', '1879', '1892', '2003', '2013', '2103'],
    'bezpieczeństwa': ['898', '899', '900', '901', '902', '903', '1604', '1806', '1879', '1892', '2003', '2013', '2103'],
    
    // Układ spryskiwaczy
    'spryskiwacz': ['100', '101', '106', '111', '112', '113', '114', '116', '117', '118', '119', '120', '122', '123', '124', '125', '126', '127', '128', '130', '131', '132', '133'],
    'wycieraczka': ['100', '101', '106', '111', '112', '113', '114', '116', '117', '118', '119', '120', '122', '123', '124', '125', '126', '127', '128', '130', '131', '132', '133'],
    'wycieraczki': ['100', '101', '106', '111', '112', '113', '114', '116', '117', '118', '119', '120', '122', '123', '124', '125', '126', '127', '128', '130', '131', '132', '133'],
    
    // Układ ogrzewania
    'ogrzewania': ['209', '210', '211', '212', '213', '214', '215', '216', '217', '222', '223', '224', '225', '226'],
    'nagrzewnica': ['209', '210', '211', '212', '213', '214', '215', '216', '217', '222', '223', '224', '225', '226'],
    
    // Układ filtracji
    'filtr': ['290', '291', '292', '293', '308', '309', '222', '223', '224', '225', '226'],
    'filtry': ['290', '291', '292', '293', '308', '309', '222', '223', '224', '225', '226'],
    
    // Układ smarowania
    'olej': ['266', '1352', '1353', '1466', '1468', '1576', '1639', '2078'],
    'oleju': ['266', '1352', '1353', '1466', '1468', '1576', '1639', '2078'],
    'smarowania': ['266', '1352', '1353', '1466', '1468', '1576', '1639', '2078'],
    
    // Układ chłodzenia oleju
    'chłodnica oleju': ['234', '244', '246', '1307', '1376'],
    'chłodnicy oleju': ['234', '244', '246', '1307', '1376'],
    
    // Układ intercoolera
    'intercooler': ['235', '236', '240', '1559'],
    'intercoolera': ['235', '236', '240', '1559'],
    
    // Układ AdBlue
    'adblue': ['1780', '1880', '1881', '1941', '1962', '2008', '2009', '2010', '2057', '2112'],
    'adblue': ['1780', '1880', '1881', '1941', '1962', '2008', '2009', '2010', '2057', '2112'],
    
    // Układ FAP/DPF
    'fap': ['1407', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038'],
    'dpf': ['1407', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038'],
    
    // Układ LPG
    'lpg': ['1264', '1265', '1266', '1267', '1269', '1270', '1271', '1272', '1273', '1274', '1275', '2046'],
    'gaz': ['1264', '1265', '1266', '1267', '1269', '1270', '1271', '1272', '1273', '1274', '1275', '2046'],
    
    // Układ Webasto
    'webasto': ['209', '1583', '1737', '1855', '2109'],
    
    // Układ szyberdachu
    'szyberdach': ['1101', '1102', '1103', '1104', '1105', '1106', '1107'],
    'szyberdachu': ['1101', '1102', '1103', '1104', '1105', '1106', '1107'],
    
    // Układ haka holowniczego
    'hak': ['626', '627', '628', '629', '631', '632', '633', '2111'],
    'haka': ['626', '627', '628', '629', '631', '632', '633', '2111'],
    
    // Układ czujników parkowania
    'pdc': ['577', '1383', '1158', '1534', '1535', '1676', '1745'],
    'parkowania': ['577', '1383', '1158', '1534', '1535', '1676', '1745'],
    
    // Układ ESP/ABS
    'esp': ['1133', '1540', '1878'],
    'abs': ['42', '43', '45', '55', '1441', '1133', '1390', '1658', '1659', '1995'],
    
    // Układ tempomatu
    'tempomat': ['1073', '1147', '1490'],
    
    // Układ centralnego zamka
    'centralny zamek': ['1058', '1142', '1549', '1550'],
    'centralnego zamka': ['1058', '1142', '1549', '1550'],
    
    // Układ immobilizera
    'immobilizer': ['1378', '1543'],
    'immobilizera': ['1378', '1543'],
    
    // Układ alarmu
    'alarm': ['1081', '1143', '1498'],
    'alarmu': ['1081', '1143', '1498'],
    
    // Układ Bluetooth
    'bluetooth': ['1491', '1683', '1791', '2061'],
    
    // Układ GPS
    'gps': ['1504', '1508', '1509', '1685', '1966', '1876'],
    'nawigacja': ['1504', '1508', '1509', '1685', '1966', '1876'],
    
    // Układ USB
    'usb': ['1610', '1900'],
    
    // Układ ładowania
    'ładowanie': ['1954', '1997', '1998', '2049', '2054'],
    'ładowania': ['1954', '1997', '1998', '2049', '2054'],
    
    // Układ Start/Stop
    'start/stop': ['2097', '2098'],
    'start stop': ['2097', '2098'],
    
    // Układ SOS
    'sos': ['2021', '2108'],
    
    // Układ martwego pola
    'martwe pole': ['1782', '2124'],
    'martwego pola': ['1782', '2124'],
    
    // Układ Distronic
    'distronic': ['505', '1752', '2087'],
    
    // Układ ACC
    'acc': ['505'],
    
    // Układ Servotronic
    'servotronic': ['1967'],
    
    // Układ VANOS
    'vanos': ['1351'],
    
    // Układ Haldex
    'haldex': ['1894'],
    
    // Układ Visco
    'visco': ['237', '243'],
    
    // Układ Xenon
    'xenon': ['1474', '1747'],
    
    // Układ LED
    'led': ['1931', '1991'],
    
    // Układ HID
    'hid': ['1474', '1747'],
    
    // Układ Bi-Xenon
    'bi-xenon': ['1474', '1747'],
    
    // Układ Adaptive LED
    'adaptive led': ['1931', '1991'],
    
    // Układ Matrix LED
    'matrix led': ['1931', '1991'],
    
    // Układ Laser
    'laser': ['1931', '1991'],
    
    // Układ OLED
    'oled': ['1931', '1991'],
    
    // Układ Micro LED
    'micro led': ['1931', '1991'],
    
    // Układ Mini LED
    'mini led': ['1931', '1991'],
    
    // Układ QLED
    'qled': ['1931', '1991'],
    
    // Układ AMOLED
    'amoled': ['1931', '1991'],
    
    // Układ Super AMOLED
    'super amoled': ['1931', '1991'],
    
    // Układ Dynamic AMOLED
    'dynamic amoled': ['1931', '1991'],
    
    // Układ LTPO
    'ltpo': ['1931', '1991'],
    
    // Układ LTPS
    'ltps': ['1931', '1991'],
    
    // Układ IGZO
    'igzo': ['1931', '1991'],
    
    // Układ a-Si
    'a-si': ['1931', '1991'],
    
    // Układ poly-Si
    'poly-si': ['1931', '1991'],
    
    // Układ c-Si
    'c-si': ['1931', '1991'],
    
    // Układ μc-Si
    'μc-si': ['1931', '1991'],
    
    // Układ nc-Si
    'nc-si': ['1931', '1991'],
    
    // Układ uc-Si
    'uc-si': ['1931', '1991'],
    
    // Układ mc-Si
    'mc-si': ['1931', '1991'],
    
    // Układ pc-Si
    'pc-si': ['1931', '1991'],
    
    // Układ sc-Si
    'sc-si': ['1931', '1991'],
    
    // Układ zc-Si
    'zc-si': ['1931', '1991'],
    
    // Układ vc-Si
    'vc-si': ['1931', '1991'],
    
    // Układ tc-Si
    'tc-si': ['1931', '1991'],
    
    // Układ rc-Si
    'rc-si': ['1931', '1991'],
    
    // Układ fc-Si
    'fc-si': ['1931', '1991'],
    
    // Układ gc-Si
    'gc-si': ['1931', '1991'],
    
    // Układ hc-Si
    'hc-si': ['1931', '1991'],
    
    // Układ ic-Si
    'ic-si': ['1931', '1991'],
    
    // Układ jc-Si
    'jc-si': ['1931', '1991'],
    
    // Układ kc-Si
    'kc-si': ['1931', '1991'],
    
    // Układ lc-Si
    'lc-si': ['1931', '1991'],
    
    // Układ mc-Si
    'mc-si': ['1931', '1991'],
    
    // Układ nc-Si
    'nc-si': ['1931', '1991'],
    
    // Układ oc-Si
    'oc-si': ['1931', '1991'],
    
    // Układ pc-Si
    'pc-si': ['1931', '1991'],
    
    // Układ qc-Si
    'qc-si': ['1931', '1991'],
    
    // Układ rc-Si
    'rc-si': ['1931', '1991'],
    
    // Układ sc-Si
    'sc-si': ['1931', '1991'],
    
    // Układ tc-Si
    'tc-si': ['1931', '1991'],
    
    // Układ uc-Si
    'uc-si': ['1931', '1991'],
    
    // Układ vc-Si
    'vc-si': ['1931', '1991'],
    
    // Układ wc-Si
    'wc-si': ['1931', '1991'],
    
    // Układ xc-Si
    'xc-si': ['1931', '1991'],
    
    // Układ yc-Si
    'yc-si': ['1931', '1991'],
    
    // Układ zc-Si
    'zc-si': ['1931', '1991']
};

// Funkcja do normalizacji tekstu
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[ąćęłńóśźż]/g, (match) => {
            const replacements = {
                'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
                'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
            };
            return replacements[match] || match;
        })
        .trim();
}

// Funkcja do znajdowania najlepszego dopasowania na podstawie słów kluczowych
function findBestMatchByKeywords(baselinkerName, ovokoCategories) {
    const normalizedName = normalizeText(baselinkerName);
    const words = normalizedName.split(/[\s\/\-_,.()]+/).filter(word => word.length > 2);
    
    let bestMatches = [];
    let bestScore = 0;
    
    for (const word of words) {
        if (keywordMapping[word]) {
            const score = word.length;
            if (score > bestScore) {
                bestScore = score;
                bestMatches = keywordMapping[word];
            }
        }
    }
    
    if (bestMatches.length > 0) {
        // Znajdź najlepszą kategorię Ovoko z listy dopasowań
        let bestOvokoCategory = null;
        let bestOvokoScore = 0;
        
        for (const ovokoId of bestMatches) {
            const ovokoCategory = ovokoCategories.data.list.find(cat => cat.id === ovokoId);
            if (ovokoCategory) {
                const ovokoName = normalizeText(ovokoCategory.pl);
                let score = 0;
                
                // Sprawdź ile słów z nazwy Baselinker pasuje do nazwy Ovoko
                for (const word of words) {
                    if (ovokoName.includes(word)) {
                        score += word.length;
                    }
                }
                
                if (score > bestOvokoScore) {
                    bestOvokoScore = score;
                    bestOvokoCategory = ovokoCategory;
                }
            }
        }
        
        return bestOvokoCategory;
    }
    
    return null;
}

// Funkcja do znajdowania dopasowania na podstawie podobieństwa tekstu
function findBestMatchBySimilarity(baselinkerName, ovokoCategories) {
    const normalizedBaselinker = normalizeText(baselinkerName);
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const ovokoCat of ovokoCategories.data.list) {
        const normalizedOvoko = normalizeText(ovokoCat.pl);
        
        // Sprawdź czy kategoria Ovoko jest zawarta w nazwie Baselinker
        if (normalizedBaselinker.includes(normalizedOvoko) && normalizedOvoko.length > 3) {
            const score = normalizedOvoko.length;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = ovokoCat;
            }
        }
        
        // Sprawdź czy nazwa Baselinker jest zawarta w kategorii Ovoko
        if (normalizedOvoko.includes(normalizedBaselinker) && normalizedBaselinker.length > 3) {
            const score = normalizedBaselinker.length;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = ovokoCat;
            }
        }
    }
    
    // Jeśli nie znaleziono dopasowania, spróbuj znaleźć częściowe dopasowania
    if (!bestMatch) {
        for (const ovokoCat of ovokoCategories.data.list) {
            const normalizedOvoko = normalizeText(ovokoCat.pl);
            const words = normalizedBaselinker.split(/(?<=[a-z])(?=[a-z])/);
            
            for (const word of words) {
                if (word.length > 3 && normalizedOvoko.includes(word)) {
                    const score = word.length;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = ovokoCat;
                    }
                }
            }
        }
    }
    
    return bestMatch;
}

// Główne mapowanie kategorii
function createCategoryMapping() {
    const mapping = [];
    const unmapped = [];
    
    console.log('Rozpoczynam ulepszone mapowanie kategorii...');
    console.log(`Liczba kategorii Baselinker: ${baselinkerCategories.data.categories.length}`);
    console.log(`Liczba kategorii Ovoko: ${ovokoCategories.data.list.length}`);
    
    for (const baselinkerCat of baselinkerCategories.data.categories) {
        // Najpierw spróbuj znaleźć dopasowanie na podstawie słów kluczowych
        let match = findBestMatchByKeywords(baselinkerCat.name, ovokoCategories);
        let confidence = 'high';
        
        // Jeśli nie znaleziono, spróbuj na podstawie podobieństwa tekstu
        if (!match) {
            match = findBestMatchBySimilarity(baselinkerCat.name, ovokoCategories);
            confidence = 'medium';
        }
        
        if (match) {
            mapping.push({
                baselinker_id: baselinkerCat.category_id,
                baselinker_name: baselinkerCat.name,
                ovoko_id: match.id,
                ovoko_name: match.pl,
                confidence: confidence
            });
        } else {
            unmapped.push({
                baselinker_id: baselinkerCat.category_id,
                baselinker_name: baselinkerCat.name,
                reason: 'Brak dopasowania'
            });
        }
    }
    
    return { mapping, unmapped };
}

// Funkcja do zapisywania wyników
function saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Zapisz główne mapowanie
    fs.writeFileSync(
        `improved_category_mapping_${timestamp}.json`,
        JSON.stringify({
            timestamp: new Date().toISOString(),
            total_baselinker_categories: baselinkerCategories.data.categories.length,
            total_ovoko_categories: ovokoCategories.data.list.length,
            mapped_categories: results.mapping.length,
            unmapped_categories: results.unmapped.length,
            mapping: results.mapping
        }, null, 2)
    );
    
    // Zapisz nierozmapowane kategorie
    fs.writeFileSync(
        `improved_unmapped_categories_${timestamp}.json`,
        JSON.stringify({
            timestamp: new Date().toISOString(),
            unmapped_categories: results.unmapped
        }, null, 2)
    );
    
    // Zapisz statystyki
    const stats = {
        timestamp: new Date().toISOString(),
        total_baselinker: baselinkerCategories.data.categories.length,
        total_ovoko: ovokoCategories.data.list.length,
        mapped: results.mapping.length,
        unmapped: results.unmapped.length,
        success_rate: ((results.mapping.length / baselinkerCategories.data.categories.length) * 100).toFixed(2) + '%'
    };
    
    fs.writeFileSync(
        `improved_mapping_statistics_${timestamp}.json`,
        JSON.stringify(stats, null, 2)
    );
    
    console.log('\n=== WYNIKI ULEPSZONEGO MAPOWANIA ===');
    console.log(`Całkowita liczba kategorii Baselinker: ${stats.total_baselinker}`);
    console.log(`Całkowita liczba kategorii Ovoko: ${stats.total_ovoko}`);
    console.log(`Rozmapowane kategorie: ${stats.mapped}`);
    console.log(`Nierozmapowane kategorie: ${stats.unmapped}`);
    console.log(`Wskaźnik sukcesu: ${stats.success_rate}`);
    
    console.log('\nPliki zostały zapisane:');
    console.log(`- improved_category_mapping_${timestamp}.json`);
    console.log(`- improved_unmapped_categories_${timestamp}.json`);
    console.log(`- improved_mapping_statistics_${timestamp}.json`);
}

// Uruchom mapowanie
try {
    const results = createCategoryMapping();
    saveResults(results);
} catch (error) {
    console.error('Błąd podczas mapowania:', error);
}
