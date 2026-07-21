// "Mode Liste" data: themed squads/rosters to name as many of as possible.
// Most entries are a plain surname; a handful use { full, base } where the
// source distinguishes two same-surname players in the same list (e.g. two
// Fofanas) — `base` is what's accepted alone when it's unique in the list,
// `full` (base + a plain-letter qualifier, no punctuation so it stays
// typable on the in-app keyboard) is required when it isn't.
export type QuizPlayer = string | { full: string; base: string };

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizList {
  id: string;
  title: string;
  difficulty: QuizDifficulty;
  players: QuizPlayer[];
}

export function playerFull(p: QuizPlayer): string {
  return typeof p === 'string' ? p : p.full;
}

export function playerBase(p: QuizPlayer): string {
  return typeof p === 'string' ? p : p.base;
}

export const QUIZ_LISTS: QuizList[] = [
  // ═══════ FACILE ═══════
  {
    id: 'wc2018-france',
    difficulty: 'easy',
    title: 'Champions du monde 2018 (France)',
    players: [
      'Lloris', 'Mandanda', 'Areola', 'Varane', 'Umtiti', 'Kimpembe', 'Pavard', 'Hernandez', 'Sissoko', 'Rami',
      'Pogba', 'Kanté', 'Matuidi', 'Nzonzi', 'Tolisso', 'Griezmann', 'Mbappé', 'Giroud', 'Fekir', 'Dembélé',
      'Thauvin', 'Mendy',
    ],
  },
  {
    id: 'wc2022-argentine',
    difficulty: 'easy',
    title: 'Champions du monde 2022 (Argentine)',
    players: [
      { full: 'Martínez E', base: 'Martínez' }, 'Armani', 'Romero', 'Otamendi', 'Molina', 'Tagliafico', 'Acuña', 'De Paul',
      'Mac Allister', { full: 'Fernández E', base: 'Fernández' }, 'Paredes', 'Messi', { full: 'Álvarez J', base: 'Álvarez' },
      'Di María', 'Dybala', 'Lautaro Martínez', 'Montiel', 'Correa', 'Papu Gómez', 'Pezzella',
    ],
  },
  {
    id: 'wc2002-bresil',
    difficulty: 'easy',
    title: 'Brésil, champion du monde 2002',
    players: [
      'Marcos', 'Dida', 'Cafu', 'Roque Júnior', 'Lúcio', 'Edmílson', 'Roberto Carlos', 'Gilberto Silva', 'Kléberson',
      'Ronaldinho', 'Rivaldo', 'Ronaldo', 'Juninho Paulista', 'Denílson', 'Vampeta', 'Belletti', 'Kaká', 'Luizão', 'Edílson',
    ],
  },
  {
    id: 'ucl2018-real',
    difficulty: 'easy',
    title: 'Real Madrid — champion de Ligue des champions 2018',
    players: [
      'Navas', 'Casilla', 'Varane', 'Ramos', 'Marcelo', 'Carvajal', 'Nacho', 'Kroos', 'Modrić', 'Casemiro', 'Isco',
      'Bale', 'Benzema', { full: 'Ronaldo C', base: 'Ronaldo' }, 'Asensio', 'Vázquez', 'Ceballos', 'Kovačić', 'Theo Hernández',
    ],
  },
  {
    id: 'ucl2022-real',
    difficulty: 'easy',
    title: 'Real Madrid — champion de Ligue des champions 2022',
    players: [
      'Courtois', 'Lunin', 'Militão', 'Alaba', 'Carvajal', 'Mendy', 'Nacho', 'Rüdiger', 'Kroos', 'Modrić', 'Casemiro',
      'Valverde', 'Camavinga', 'Benzema', 'Vinícius Jr', 'Asensio', 'Rodrygo', 'Ceballos', 'Isco', 'Bale',
    ],
  },
  {
    id: 'ucl2011-barca',
    difficulty: 'easy',
    title: 'FC Barcelone — champion de Ligue des champions 2011',
    players: [
      'Valdés', 'Piqué', 'Puyol', 'Abidal', 'Alves', 'Mascherano', 'Xavi', 'Iniesta', 'Busquets', 'Messi', 'Villa',
      'Pedro', 'Fàbregas', 'Keita', 'Bojan', 'Afellay', 'Adriano', 'Maxwell', 'Pinto',
    ],
  },
  {
    id: 'galacticos-real',
    difficulty: 'easy',
    title: 'Les Galactiques du Real Madrid (2000-2007)',
    players: [
      'Casillas', 'Roberto Carlos', 'Hierro', 'Salgado', 'Helguera', 'Makélélé', 'Zidane', 'Figo', 'Beckham',
      { full: 'Ronaldo Fenômeno', base: 'Ronaldo' }, 'Raúl', 'Guti', 'Morientes', 'Solari', 'McManaman', 'Owen', 'Woodgate',
    ],
  },
  {
    id: 'can2022-senegal',
    difficulty: 'easy',
    title: "Sénégal, championne d'Afrique des Nations 2022",
    players: [
      'Mendy', 'Diallo', 'Koulibaly', { full: 'Diallo A', base: 'Diallo' }, 'Ciss', { full: 'Gueye I', base: 'Gueye' },
      { full: 'Sarr P', base: 'Sarr' }, 'Mané', 'Dia', 'Diatta', 'Jakobs', 'Sabaly', 'Krépin Diatta', 'Niang', 'Ndiaye',
      'Kouyaté', 'Cissé', 'Ballo-Touré',
    ],
  },
  {
    id: 'can2024-cotedivoire',
    difficulty: 'easy',
    title: "Côte d'Ivoire, championne d'Afrique des Nations 2024",
    players: [
      { full: 'Fofana Y', base: 'Fofana' }, 'Ndicka', 'Sangaré', 'Konan', 'Aurier', 'Kessié', { full: 'Fofana S', base: 'Fofana' },
      'Haller', 'Bailly', { full: 'Sangaré I', base: 'Sangaré' }, 'Diakité', 'Gradel', 'Krasso', 'Kouamé', 'Singo', 'Adingra', 'Bamba',
    ],
  },
  {
    id: 'euro2016-portugal',
    difficulty: 'easy',
    title: "Portugal, championne d'Europe 2016",
    players: [
      'Rui Patrício', 'Pepe', 'Fonte', 'Guerreiro', 'Cédric', 'João Mário', 'William Carvalho', 'Renato Sanches',
      'Adrien Silva', 'Cristiano Ronaldo', 'Nani', 'Éder', 'Quaresma', 'Moutinho', 'André Gomes', 'Danilo Pereira', 'Vieirinha',
    ],
  },
  {
    id: 'ucl2020-psg',
    difficulty: 'easy',
    title: 'PSG — finaliste de Ligue des champions 2020',
    players: [
      'Navas', { full: 'Silva T', base: 'Silva' }, 'Marquinhos', 'Kimpembe', 'Kehrer', 'Bernat', 'Paredes', 'Verratti',
      'Herrera', 'Di María', 'Mbappé', 'Neymar', 'Icardi', 'Draxler', 'Sarabia', 'Kurzawa', 'Rico', 'Meunier',
    ],
  },
  {
    id: 'buteurs-cdm',
    difficulty: 'easy',
    title: 'Meilleurs buteurs de l\'histoire de la Coupe du Monde',
    players: [
      'Miroslav Klose', 'Ronaldo Nazário', 'Gerd Müller', 'Just Fontaine', 'Pelé', 'Kylian Mbappé', 'Jürgen Klinsmann',
      'Sándor Kocsis', 'Gabriel Batistuta', 'Thomas Müller', 'Grzegorz Lato', 'Gary Lineker', 'Lionel Messi',
      'Guillermo Stábile', 'Teófilo Cubillas', 'Harry Kane', 'Diego Maradona', 'Roberto Baggio',
    ],
  },

  // ═══════ MOYEN ═══════
  {
    id: 'wc1998-france',
    difficulty: 'medium',
    title: 'Champions du monde 1998 (France)',
    players: [
      'Barthez', 'Lama', 'Charbonnier', 'Thuram', 'Desailly', 'Blanc', 'Lizarazu', 'Leboeuf', 'Candela', 'Karembeu',
      'Deschamps', 'Petit', 'Vieira', 'Boghossian', 'Djorkaeff', 'Zidane', 'Pires', "Guivarc'h", 'Henry', 'Trezeguet',
      'Dugarry', 'Diomède',
    ],
  },
  {
    id: 'euro2000-france',
    difficulty: 'medium',
    title: "France, championne d'Europe 2000",
    players: [
      'Barthez', 'Lama', 'Charbonnier', 'Thuram', 'Desailly', 'Blanc', 'Leboeuf', 'Lizarazu', 'Candela', 'Zidane',
      'Deschamps', 'Petit', 'Vieira', 'Djorkaeff', 'Wiltord', 'Henry', 'Trezeguet', 'Anelka', 'Dugarry', 'Pires',
    ],
  },
  {
    id: 'wc2010-espagne',
    difficulty: 'medium',
    title: 'Espagne, championne du monde 2010',
    players: [
      'Casillas', 'Reina', 'Piqué', 'Puyol', 'Ramos', 'Capdevila', 'Arbeloa', 'Alonso', 'Xavi', 'Iniesta', 'Busquets',
      'Fàbregas', 'Pedro', 'Villa', 'Torres', 'Silva', 'Navas', 'Albiol', 'Marchena', 'Mata',
    ],
  },
  {
    id: 'wc2014-allemagne',
    difficulty: 'medium',
    title: 'Allemagne, championne du monde 2014',
    players: [
      'Neuer', 'Weidenfeller', 'Boateng', 'Hummels', 'Mertesacker', 'Höwedes', 'Lahm', 'Kroos', 'Schweinsteiger',
      'Khedira', 'Özil', 'Müller', 'Klose', 'Götze', 'Podolski', 'Schürrle', 'Draxler', 'Kramer', 'Durm', 'Gündogan',
    ],
  },
  {
    id: 'wc2006-italie',
    difficulty: 'medium',
    title: 'Italie, championne du monde 2006',
    players: [
      'Buffon', 'Toldo', 'Cannavaro', 'Nesta', 'Materazzi', 'Zambrotta', 'Grosso', 'Pirlo', 'Gattuso', 'Camoranesi',
      'Perrotta', 'Totti', 'Del Piero', 'Toni', 'Gilardino', 'Iaquinta', 'De Rossi', 'Barzagli', 'Zaccardo', 'Oddo',
    ],
  },
  {
    id: 'euro2021-italie',
    difficulty: 'medium',
    title: "Italie, championne d'Europe 2021 (Euro 2020)",
    players: [
      'Donnarumma', 'Sirigu', 'Bonucci', 'Chiellini', 'Di Lorenzo', 'Spinazzola', 'Emerson', 'Jorginho', 'Verratti',
      'Barella', 'Insigne', 'Immobile', 'Chiesa', 'Berardi', 'Bernardeschi', 'Locatelli', 'Pessina', 'Belotti', 'Florenzi', 'Toloi',
    ],
  },
  {
    id: 'euro2012-espagne',
    difficulty: 'medium',
    title: "Espagne, championne d'Europe 2012",
    players: [
      'Casillas', 'Piqué', 'Ramos', 'Arbeloa', 'Alba', 'Alonso', 'Busquets', 'Xavi', 'Iniesta', 'Silva', 'Fàbregas',
      'Torres', 'Pedro', 'Xabi Prieto', 'Mata', 'Navas', 'Cazorla', 'Negredo', 'Llorente', 'Valdés',
    ],
  },
  {
    id: 'ucl2019-liverpool',
    difficulty: 'medium',
    title: 'Liverpool — champion de Ligue des champions 2019',
    players: [
      'Alisson', 'Van Dijk', 'Matip', 'Robertson', 'Alexander-Arnold', 'Fabinho', 'Henderson', 'Wijnaldum', 'Mané',
      'Salah', 'Firmino', 'Milner', 'Origi', 'Shaqiri', 'Lallana', 'Lovren', 'Gomez', 'Moreno',
    ],
  },
  {
    id: 'treble2013-bayern',
    difficulty: 'medium',
    title: 'Bayern Munich — triplé 2013',
    players: [
      'Neuer', 'Boateng', 'Dante', 'Lahm', 'Alaba', 'Schweinsteiger', 'Kroos', { full: 'Martínez J', base: 'Martínez' },
      'Robben', 'Ribéry', 'Mandžukić', 'Müller', 'Gómez', 'Van Buyten', 'Rafinha', 'Contento', 'Pizarro', 'Shaqiri',
    ],
  },
  {
    id: 'ucl2012-chelsea',
    difficulty: 'medium',
    title: 'Chelsea — champion de Ligue des champions 2012',
    players: [
      'Čech', 'Cahill', 'Terry', 'Ivanović', { full: 'Cole A', base: 'Cole' }, 'Lampard', 'Mikel', 'Ramires', 'Bertrand',
      'Kalou', 'Drogba', 'Torres', 'Meireles', 'Malouda', 'Sturridge', 'Turnbull', 'Cissokho',
    ],
  },
  {
    id: 'can2019-algerie',
    difficulty: 'medium',
    title: "Algérie, championne d'Afrique des Nations 2019",
    players: [
      "M'Bolhi", 'Mandi', 'Bensebaïni', 'Atal', 'Bennacer', 'Feghouli', 'Belaïli', 'Mahrez', 'Slimani', 'Delandri',
      'Guedioura', 'Boudaoui', 'Brahimi', 'Bounedjah', 'Zeffane', 'Meziane', 'Ghezzal',
    ],
  },
  {
    id: 'copa2021-argentine',
    difficulty: 'medium',
    title: 'Argentine, championne de la Copa America 2021',
    players: [
      { full: 'Martínez E', base: 'Martínez' }, 'Otamendi', 'Romero', 'Tagliafico', 'Molina', 'De Paul', 'Paredes',
      'Lo Celso', 'Messi', 'Di María', 'Lautaro Martínez', { full: 'Rodríguez G', base: 'Rodríguez' },
      { full: 'Álvarez J', base: 'Álvarez' }, 'Dybala', 'Correa', 'Acuña', 'Foyth',
    ],
  },
  {
    id: 'marseillais-champions',
    difficulty: 'medium',
    title: "Anciens Marseillais devenus champions du monde ou d'Europe",
    players: [
      'Franck Ribéry', 'Mathieu Valbuena', 'André-Pierre Gignac', 'Samir Nasri', 'Steve Mandanda', 'Patrice Evra',
      'Djibril Cissé', 'Dimitri Payet', 'Florian Thauvin', 'William Gallas', 'Bixente Lizarazu', 'Basile Boli',
    ],
  },
  {
    id: 'ballon-dor-tous',
    difficulty: 'medium',
    title: "Vainqueurs du Ballon d'Or, toutes époques",
    players: [
      'Stanley Matthews', 'Alfredo Di Stéfano', 'Raymond Kopa', { full: 'Luis Suárez Miramontes', base: 'Luis Suárez' },
      'Denis Law', 'Eusébio', 'Bobby Charlton', 'Franz Beckenbauer', 'Gerd Müller', 'Johan Cruyff', 'Kevin Keegan',
      'Karl-Heinz Rummenigge', 'Michel Platini', 'Marco van Basten', 'Ronaldo Nazário', 'Zinedine Zidane', 'Luka Modrić',
      'Lionel Messi', 'Cristiano Ronaldo', 'Karim Benzema',
    ],
  },
  {
    id: 'buteurs-ligue1',
    difficulty: 'medium',
    title: 'Meilleurs buteurs de l\'histoire de la Ligue 1',
    players: [
      'Delio Onnis', 'Bernard Lacombe', 'Hervé Revelli', 'Jean-Pierre Papin', 'Josip Skoblar', 'Kylian Mbappé',
      'Carlos Bianchi', 'Rachid Mekhloufi', 'Roger Piantoni', 'Édinson Cavani', 'Wissam Ben Yedder', 'Alexandre Lacazette', 'Nolan Roux',
    ],
  },

  // ═══════ DIFFICILE ═══════
  {
    id: 'wc1986-argentine',
    difficulty: 'hard',
    title: 'Champions du monde 1986 (Argentine)',
    players: [
      'Pumpido', 'Ruggeri', 'Brown', 'Cuciuffo', 'Olarticoechea', 'Batista', 'Giusti', 'Burruchaga', 'Maradona',
      'Valdano', 'Enrique', 'Pasculli', 'Tapia', 'Islas', 'Trobbiani', 'Almirón',
    ],
  },
  {
    id: 'euro1984-france',
    difficulty: 'hard',
    title: "France, championne d'Europe 1984",
    players: [
      'Bats', 'Battiston', 'Le Roux', 'Bossis', 'Ayache', 'Amoros', 'Fernández', 'Tigana', 'Platini', 'Giresse',
      'Bellone', 'Ferreri', 'Lacombe', 'Genghini', 'Tusseau', 'Domergue',
    ],
  },
  {
    id: 'ucl2007-milan',
    difficulty: 'hard',
    title: 'AC Milan — champion de Ligue des champions 2007',
    players: [
      'Dida', 'Nesta', 'Maldini', 'Jankulovski', 'Oddo', 'Gattuso', 'Pirlo', 'Ambrosini', 'Seedorf', 'Kaká', 'Inzaghi',
      'Gilardino', 'Cafu', 'Kalac', 'Favalli', 'Simić', 'Brocchi', { full: 'Ronaldo F', base: 'Ronaldo' },
    ],
  },
  {
    id: 'ucl2005-liverpool',
    difficulty: 'hard',
    title: 'Liverpool — champion de Ligue des champions 2005 (Istanbul)',
    players: [
      'Dudek', 'Carragher', 'Hyypiä', 'Traoré', 'Riise', 'Xabi Alonso', 'Gerrard', 'Kewell', 'Baroš', 'Garcia',
      'Finnan', 'Smicer', 'Kromkamp', 'Biscan', 'Cissé', 'Hamann', 'Warnock', 'Dutt',
    ],
  },
  {
    id: 'treble1999-manutd',
    difficulty: 'hard',
    title: 'Manchester United — triplé 1999',
    players: [
      'Schmeichel', { full: 'Neville G', base: 'Neville' }, { full: 'Neville P', base: 'Neville' }, 'Stam', 'Johnsen',
      'Irwin', 'Beckham', 'Keane', 'Scholes', 'Giggs', 'Yorke', { full: 'Cole A', base: 'Cole' }, 'Sheringham',
      'Solskjær', 'Butt', 'Blomqvist', 'Berg',
    ],
  },
  {
    id: 'barca-et-real',
    difficulty: 'hard',
    title: 'Joueurs passés par le FC Barcelone ET le Real Madrid',
    players: [
      'Luis Figo', 'Luís Enrique', 'Michael Laudrup', 'Bernd Schuster', "Samuel Eto'o", 'Ronaldo Nazário',
      'Javier Saviola', 'Robert Prosinečki', 'Gheorghe Hagi', 'Albert Ferrer', 'Alfonso Pérez', 'Luis Milla',
    ],
  },
  {
    id: 'ballon-dor-africain',
    difficulty: 'hard',
    title: "Vainqueurs du Ballon d'Or africain (France Football)",
    players: [
      'George Weah', 'Abédi Pelé', 'Roger Milla', 'Kalusha Bwalya', 'Nwankwo Kanu', 'El Hadji Diouf', "Samuel Eto'o",
      'Didier Drogba', 'Yaya Touré', 'Sadio Mané', 'Riyad Mahrez', 'Mohamed Salah', 'Pierre-Emerick Aubameyang', 'Victor Osimhen',
    ],
  },
  {
    id: 'ucl-deux-clubs',
    difficulty: 'hard',
    title: 'Joueurs ayant remporté la Ligue des champions avec deux clubs différents',
    players: [
      'Clarence Seedorf', 'Marcel Desailly', 'Paulo Sousa', 'Cristiano Ronaldo', "Samuel Eto'o", 'Xabi Alonso', 'Toni Kroos',
    ],
  },
];
