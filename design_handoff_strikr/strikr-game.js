(function(){
  // Inject the reveal-animation styles once (works standalone, no dependency
  // on any host page's stylesheet).
  if (!document.getElementById('strikr-fx-style')) {
    var strikrFxStyleEl = document.createElement('style');
    strikrFxStyleEl.id = 'strikr-fx-style';
    strikrFxStyleEl.textContent = '@keyframes strikr-card-in{0%{opacity:0;transform:translateY(10px) scale(.96)}60%{opacity:1;transform:translateY(-2px) scale(1.01)}100%{opacity:1;transform:translateY(0) scale(1)}}'+
      '.strikr-card-reveal{animation:strikr-card-in .42s cubic-bezier(.34,1.56,.64,1) both}';
    document.head.appendChild(strikrFxStyleEl);
  }
  var LOGOS = {
    'Bryne FK':'https://en.wikipedia.org/wiki/Special:FilePath/Bryne_FK_logo.svg?width=240',
    'Molde FK':'https://commons.wikimedia.org/wiki/Special:FilePath/Molde_Fotball_Logo.svg?width=240',
    'RB Salzburg':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Red_Bull_Salzburg_logo.svg?width=240',
    'Borussia Dortmund':'https://commons.wikimedia.org/wiki/Special:FilePath/Borussia_Dortmund_logo.svg?width=240',
    'Manchester City':'https://en.wikipedia.org/wiki/Special:FilePath/Manchester_City_FC_badge.svg?width=240',
    'Real Madrid':'https://commons.wikimedia.org/wiki/Special:FilePath/Real_Madrid_CF.svg?width=240',
    'FC Barcelona':'https://commons.wikimedia.org/wiki/Special:FilePath/FC_Barcelona_(crest).svg?width=240',
    'Paris Saint-Germain':'https://en.wikipedia.org/wiki/Special:FilePath/Paris_Saint-Germain_F.C..svg?width=240',
    'AS Monaco':'https://en.wikipedia.org/wiki/Special:FilePath/AS_Monaco_FC.svg?width=240',
    'Juventus':'https://en.wikipedia.org/wiki/Special:FilePath/Juventus_FC_2017_logo.svg?width=240',
    'Bayern Munich':'https://commons.wikimedia.org/wiki/Special:FilePath/FC_Bayern_M%C3%BCnchen_logo_(2017).svg?width=240',
    'Liverpool':'https://en.wikipedia.org/wiki/Special:FilePath/Liverpool_FC.svg?width=240',
    'Manchester United':'https://en.wikipedia.org/wiki/Special:FilePath/Manchester_United_FC_crest.svg?width=240',
    'Chelsea':'https://en.wikipedia.org/wiki/Special:FilePath/Chelsea_FC.svg?width=240',
    'Arsenal':'https://en.wikipedia.org/wiki/Special:FilePath/Arsenal_FC.svg?width=240',
    'Tottenham':'https://en.wikipedia.org/wiki/Special:FilePath/Tottenham_Hotspur.svg?width=240',
    'Inter':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Internazionale_Milano_2021.svg?width=240',
    'AC Milan':'https://en.wikipedia.org/wiki/Special:FilePath/Logo_of_AC_Milan.svg?width=240',
    'Napoli':'https://en.wikipedia.org/wiki/Special:FilePath/SSC_Napoli.svg?width=240',
    'Atlético Madrid':'https://en.wikipedia.org/wiki/Special:FilePath/Atletico_Madrid_2024_logo.svg?width=240',
    'Sporting CP':'https://en.wikipedia.org/wiki/Special:FilePath/Sporting_Clube_de_Portugal_(Logo).svg?width=240',
    'Benfica':'https://en.wikipedia.org/wiki/Special:FilePath/SL_Benfica_logo.svg?width=240',
    'Ajax':'https://en.wikipedia.org/wiki/Special:FilePath/Ajax_Amsterdam.svg?width=240',
    'PSV':'https://en.wikipedia.org/wiki/Special:FilePath/PSV_Eindhoven.svg?width=240',
    'Roma':'https://en.wikipedia.org/wiki/Special:FilePath/AS_Roma_logo_(2017).svg?width=240',
    'Lazio':'https://en.wikipedia.org/wiki/Special:FilePath/S.S._Lazio_badge.svg?width=240',
    'Lyon':'https://en.wikipedia.org/wiki/Special:FilePath/Olympique_Lyonnais.svg?width=240',
    'Olympique Lyonnais':'https://en.wikipedia.org/wiki/Special:FilePath/Olympique_Lyonnais.svg?width=240',
    'Marseille':'https://en.wikipedia.org/wiki/Special:FilePath/Olympique_de_Marseille_logo.svg?width=240',
    'Lille':'https://en.wikipedia.org/wiki/Special:FilePath/Logo_LOSC_Lille_2018.svg?width=240',
    'Rennes':'https://en.wikipedia.org/wiki/Special:FilePath/Stade_Rennais_FC.svg?width=240',
    'Al-Nassr':'https://en.wikipedia.org/wiki/Special:FilePath/Al-Nassr_FC_Logo.svg?width=240',
    'Al-Hilal':'https://en.wikipedia.org/wiki/Special:FilePath/Al_Hilal_SFC_logo.svg?width=240',
    'Al-Ittihad':'https://en.wikipedia.org/wiki/Special:FilePath/Ittihad_Club_(Jeddah)_logo.svg?width=240',
    'Inter Miami':'https://en.wikipedia.org/wiki/Special:FilePath/Inter_Miami_CF_logo.svg?width=240',
    'RB Leipzig':'https://en.wikipedia.org/wiki/Special:FilePath/RB_Leipzig_2014_logo.svg?width=240',
    'Bayer Leverkusen':'https://en.wikipedia.org/wiki/Special:FilePath/Bayer_04_Leverkusen_logo.svg?width=240',
    'Fiorentina':'https://en.wikipedia.org/wiki/Special:FilePath/ACF_Fiorentina.svg?width=240',
    'Newcastle United':'https://en.wikipedia.org/wiki/Special:FilePath/Newcastle_United_Logo.svg?width=240',
    'Everton':'https://en.wikipedia.org/wiki/Special:FilePath/Everton_FC_logo.svg?width=240',
    'Leicester City':'https://en.wikipedia.org/wiki/Special:FilePath/Leicester_City_crest.svg?width=240',
    'Aston Villa':'https://en.wikipedia.org/wiki/Special:FilePath/Aston_Villa_FC_new_crest.svg?width=240',
    'Sevilla':'https://en.wikipedia.org/wiki/Special:FilePath/Sevilla_FC_logo.svg?width=240',
    'Valencia':'https://en.wikipedia.org/wiki/Special:FilePath/Valenciacf.svg?width=240',
    'Figueirense':'https://en.wikipedia.org/wiki/Special:FilePath/Figueirense_FC_logo.svg?width=240',
    'Hoffenheim':'https://en.wikipedia.org/wiki/Special:FilePath/Logo_TSG_Hoffenheim.svg?width=240',
    'TSG Hoffenheim':'https://en.wikipedia.org/wiki/Special:FilePath/Logo_TSG_Hoffenheim.svg?width=240',
    'Al-Ahli':'https://en.wikipedia.org/wiki/Special:FilePath/Al-Ahli_Saudi_FC_Logo.svg?width=240',
    'West Ham':'https://en.wikipedia.org/wiki/Special:FilePath/West_Ham_United_FC_logo.svg?width=240',
    'Santos':'https://en.wikipedia.org/wiki/Special:FilePath/Santos_logo.svg?width=240',
    'São Paulo':'https://en.wikipedia.org/wiki/Special:FilePath/Brasao_do_Sao_Paulo_Futebol_Clube.svg?width=240',
    'Flamengo':'https://en.wikipedia.org/wiki/Special:FilePath/Flamengo_braz_logo.svg?width=240',
    'Palmeiras':'https://en.wikipedia.org/wiki/Special:FilePath/Palmeiras_logo.svg?width=240',
    'Corinthians':'https://en.wikipedia.org/wiki/Special:FilePath/Sport_Club_Corinthians_Paulista.svg?width=240',
    'Orlando City':'https://en.wikipedia.org/wiki/Special:FilePath/Orlando_City_SC_2015_logo.svg?width=240',
    'LA Galaxy':'https://en.wikipedia.org/wiki/Special:FilePath/Los_Angeles_Galaxy_logo.svg?width=240',
    'Boca Juniors':'https://en.wikipedia.org/wiki/Special:FilePath/Boca_Juniors_logo18.svg?width=240',
    'River Plate':'https://en.wikipedia.org/wiki/Special:FilePath/Escudo_del_C_A_River_Plate.svg?width=240',
    'Independiente':'https://en.wikipedia.org/wiki/Special:FilePath/Escudo_del_Club_Atl%C3%A9tico_Independiente.svg?width=240',
    'Porto':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Porto.svg?width=240',
    'FC Porto':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Porto.svg?width=240',
    'Braga':'https://en.wikipedia.org/wiki/Special:FilePath/SC_Braga_logo.svg?width=240',
    'Wolves':'https://en.wikipedia.org/wiki/Special:FilePath/Wolverhampton_Wanderers.svg?width=240',
    'Wolverhampton':'https://en.wikipedia.org/wiki/Special:FilePath/Wolverhampton_Wanderers.svg?width=240',
    'Brighton':'https://en.wikipedia.org/wiki/Special:FilePath/Brighton_%26_Hove_Albion_logo.svg?width=240',
    'Crystal Palace':'https://en.wikipedia.org/wiki/Special:FilePath/Crystal_Palace_FC_logo_(2022).svg?width=240',
    'Fulham':'https://en.wikipedia.org/wiki/Special:FilePath/Fulham_FC_(shield).svg?width=240',
    'Southampton':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Southampton.svg?width=240',
    'Nice':'https://en.wikipedia.org/wiki/Special:FilePath/OGC_Nice_logo.svg?width=240',
    'OGC Nice':'https://en.wikipedia.org/wiki/Special:FilePath/OGC_Nice_logo.svg?width=240',
    'Nantes':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Nantes_logo.svg?width=240',
    'Bordeaux':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Girondins_de_Bordeaux_logo.svg?width=240',
    'Saint-Étienne':'https://en.wikipedia.org/wiki/Special:FilePath/AS_Saint-Etienne_logo.svg?width=240',
    'Reims':'https://en.wikipedia.org/wiki/Special:FilePath/Stade_de_Reims_logo.svg?width=240',
    'Strasbourg':'https://en.wikipedia.org/wiki/Special:FilePath/Racing_Club_de_Strasbourg_logo.svg?width=240',
    'Lens':'https://en.wikipedia.org/wiki/Special:FilePath/RC_Lens_logo.svg?width=240',
    'Montpellier':'https://en.wikipedia.org/wiki/Special:FilePath/Montpellier_H%C3%A9rault_Sport_Club_(logo).svg?width=240',
    'Toulouse':'https://en.wikipedia.org/wiki/Special:FilePath/Toulouse_FC_2018_logo.svg?width=240',
    'Genoa':'https://en.wikipedia.org/wiki/Special:FilePath/Genoa_CFC_logo.svg?width=240',
    'Sampdoria':'https://en.wikipedia.org/wiki/Special:FilePath/Logo_UC_Sampdoria.svg?width=240',
    'Torino':'https://en.wikipedia.org/wiki/Special:FilePath/Torino_FC_Logo.svg?width=240',
    'Atalanta':'https://en.wikipedia.org/wiki/Special:FilePath/AtalantaBC.svg?width=240',
    'Udinese':'https://en.wikipedia.org/wiki/Special:FilePath/Udinese_Calcio_logo.svg?width=240',
    'Bologna':'https://en.wikipedia.org/wiki/Special:FilePath/Bologna_F.C._1909_logo.svg?width=240',
    'Villarreal':'https://en.wikipedia.org/wiki/Special:FilePath/Villarreal_CF_logo-en.svg?width=240',
    'Real Sociedad':'https://en.wikipedia.org/wiki/Special:FilePath/Real_Sociedad_logo.svg?width=240',
    'Athletic Bilbao':'https://en.wikipedia.org/wiki/Special:FilePath/Club_Athletic_Bilbao_logo.svg?width=240',
    'Real Betis':'https://en.wikipedia.org/wiki/Special:FilePath/Real_betis_logo.svg?width=240',
    'Getafe':'https://en.wikipedia.org/wiki/Special:FilePath/Getafe_CF_logo.svg?width=240',
    'Espanyol':'https://en.wikipedia.org/wiki/Special:FilePath/RCD_Espanyol_2019.svg?width=240',
    'Celta Vigo':'https://en.wikipedia.org/wiki/Special:FilePath/RC_Celta_de_Vigo_logo.svg?width=240',
    'Mönchengladbach':'https://en.wikipedia.org/wiki/Special:FilePath/Borussia_M%C3%B6nchengladbach_logo.svg?width=240',
    'Borussia Mönchengladbach':'https://en.wikipedia.org/wiki/Special:FilePath/Borussia_M%C3%B6nchengladbach_logo.svg?width=240',
    'Wolfsburg':'https://en.wikipedia.org/wiki/Special:FilePath/Logo-VfL-Wolfsburg.svg?width=240',
    'Werder Bremen':'https://en.wikipedia.org/wiki/Special:FilePath/SV-Werder-Bremen-Logo.svg?width=240',
    'Schalke 04':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Schalke_04_Logo.svg?width=240',
    'Eintracht Frankfurt':'https://en.wikipedia.org/wiki/Special:FilePath/Eintracht_Frankfurt_Logo.svg?width=240',
    'Stuttgart':'https://en.wikipedia.org/wiki/Special:FilePath/VfB_Stuttgart_1893_Logo.svg?width=240',
    'Freiburg':'https://en.wikipedia.org/wiki/Special:FilePath/SC_Freiburg_logo.svg?width=240',
    'Hamburger SV':'https://en.wikipedia.org/wiki/Special:FilePath/Hamburger_SV_logo.svg?width=240',
    'Feyenoord':'https://en.wikipedia.org/wiki/Special:FilePath/Feyenoord_logo.svg?width=240',
    'AZ Alkmaar':'https://en.wikipedia.org/wiki/Special:FilePath/AZ_Alkmaar_logo.svg?width=240',
    'Anderlecht':'https://en.wikipedia.org/wiki/Special:FilePath/Anderlecht_Logo.svg?width=240',
    'Club Brugge':'https://en.wikipedia.org/wiki/Special:FilePath/Club_Brugge_KV_logo.svg?width=240',
    'Genk':'https://en.wikipedia.org/wiki/Special:FilePath/KRC_Genk_logo_2016.svg?width=240',
    'Standard Liège':'https://en.wikipedia.org/wiki/Special:FilePath/Royal_Standard_de_Li%C3%A8ge_logo.svg?width=240',
    'Celtic':'https://en.wikipedia.org/wiki/Special:FilePath/Celtic_FC.svg?width=240',
    'Rangers':'https://en.wikipedia.org/wiki/Special:FilePath/Rangers_FC.svg?width=240',
    'Galatasaray':'https://en.wikipedia.org/wiki/Special:FilePath/Galatasaray_Sports_Club_Logo.svg?width=240',
    'Fenerbahçe':'https://en.wikipedia.org/wiki/Special:FilePath/Fenerbah%C3%A7e_SK.svg?width=240',
    'Beşiktaş':'https://en.wikipedia.org/wiki/Special:FilePath/BJK_logo.svg?width=240',
    'Trabzonspor':'https://en.wikipedia.org/wiki/Special:FilePath/Trabzonspor_logo.svg?width=240',
    'Shakhtar Donetsk':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Shakhtar_Donetsk.svg?width=240',
    'Dynamo Kyiv':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Dynamo_Kyiv_logo.svg?width=240',
    'Zenit':'https://en.wikipedia.org/wiki/Special:FilePath/FC_Zenit_(2015)_logo.svg?width=240',
    'CSKA Moscow':'https://en.wikipedia.org/wiki/Special:FilePath/CSKA_Moscow_Logo_2010.svg?width=240',
    'Al-Shabab':'https://en.wikipedia.org/wiki/Special:FilePath/Al_Shabab_FC_(Riyadh)_logo.svg?width=240',
    'Al-Fateh':'https://en.wikipedia.org/wiki/Special:FilePath/Al-Fateh_SC_logo.svg?width=240',
    'Al-Ettifaq':'https://en.wikipedia.org/wiki/Special:FilePath/Al-Ettifaq_FC_logo.svg?width=240',
    'LAFC':'https://en.wikipedia.org/wiki/Special:FilePath/Los_Angeles_Football_Club.svg?width=240',
    'Los Angeles FC':'https://en.wikipedia.org/wiki/Special:FilePath/Los_Angeles_Football_Club.svg?width=240',
    'DC United':'https://en.wikipedia.org/wiki/Special:FilePath/D.C._United_logo_(2016).svg?width=240',
    'Toronto FC':'https://en.wikipedia.org/wiki/Special:FilePath/Toronto_FC_Logo.svg?width=240',
    'New York City FC':'https://en.wikipedia.org/wiki/Special:FilePath/New_York_City_FC_logo.svg?width=240',
    'Seattle Sounders':'https://en.wikipedia.org/wiki/Special:FilePath/Seattle_Sounders_FC.svg?width=240',
    'Al-Duhail':'https://en.wikipedia.org/wiki/Special:FilePath/Al-Duhail_SC_logo.svg?width=240',
    'Al-Sadd':'https://en.wikipedia.org/wiki/Special:FilePath/Al-Sadd_SC_logo.svg?width=240',
    'Cruzeiro':'https://en.wikipedia.org/wiki/Special:FilePath/Cruzeiro_Esporte_Clube_(logo).svg?width=240',
    'Grêmio':'https://en.wikipedia.org/wiki/Special:FilePath/Gremio_logo.svg?width=240',
    'Fluminense':'https://en.wikipedia.org/wiki/Special:FilePath/Fluminense_FC_crest.svg?width=240',
    'Botafogo':'https://en.wikipedia.org/wiki/Special:FilePath/Botafogo_de_Futebol_e_Regatas_logo.svg?width=240',
    'Vasco da Gama':'https://en.wikipedia.org/wiki/Special:FilePath/CR_Vasco_da_Gama_logo.svg?width=240',
    'Athletico Paranaense':'https://en.wikipedia.org/wiki/Special:FilePath/Club_Athletico_Paranaense_logo.svg?width=240',
    'Internacional':'https://en.wikipedia.org/wiki/Special:FilePath/Escudo_do_Sport_Club_Internacional.svg?width=240',
    'Bahia':'https://en.wikipedia.org/wiki/Special:FilePath/Esporte_Clube_Bahia_logo.svg?width=240'
  };
  var PHOTOS = {
    'Erling Haaland':'https://commons.wikimedia.org/wiki/Special:FilePath/Erling_Haaland_2023_(cropped).jpg?width=1200',
    'Kylian Mbappé':'https://commons.wikimedia.org/wiki/Special:FilePath/Kylian_Mbappé_2019.jpg?width=1200',
    'Lionel Messi':'https://commons.wikimedia.org/wiki/Special:FilePath/Lionel_Messi_20180626_(cropped).jpg?width=1200',
    'Cristiano Ronaldo':'https://commons.wikimedia.org/wiki/Special:FilePath/Cristiano_Ronaldo_2018.jpg?width=1200',
    'Jude Bellingham':'https://commons.wikimedia.org/wiki/Special:FilePath/Jude_Bellingham_2023_(cropped).jpg?width=1200',
    'Vinícius Júnior':'https://commons.wikimedia.org/wiki/Special:FilePath/Vinicius_Junior_2018.jpg?width=1200',
    'Neymar Jr':'https://commons.wikimedia.org/wiki/Special:FilePath/Bra-Cos_(23).jpg?width=1200',
    'Roberto Firmino':'https://commons.wikimedia.org/wiki/Special:FilePath/Roberto_Firmino_2018.jpg?width=1200',
    'Kevin De Bruyne':'https://commons.wikimedia.org/wiki/Special:FilePath/Kevin_De_Bruyne_201807091.jpg?width=1200',
    'Mohamed Salah':'https://commons.wikimedia.org/wiki/Special:FilePath/Mohamed_Salah_2018.jpg?width=1200',
    'Robert Lewandowski':'https://commons.wikimedia.org/wiki/Special:FilePath/Robert_Lewandowski_2018.jpg?width=1200',
    'Luka Modrić':'https://commons.wikimedia.org/wiki/Special:FilePath/Modric_(RMA_-_ITA)_(cropped).jpg?width=1200',
    'Karim Benzema':'https://commons.wikimedia.org/wiki/Special:FilePath/Karim_Benzema_2018.jpg?width=1200',
    'Antoine Griezmann':'https://commons.wikimedia.org/wiki/Special:FilePath/Antoine_Griezmann_2018.jpg?width=1200',
    'Harry Kane':'https://commons.wikimedia.org/wiki/Special:FilePath/Harry_Kane_2018.jpg?width=1200',
    'Son Heung-min':'https://commons.wikimedia.org/wiki/Special:FilePath/2020-11-11_Fu%C3%9Fball,_M%C3%A4nner,_L%C3%A4nderspiel,_Deutschland-Tschechien_1DX_3928_by_Stepro_(cropped).jpg?width=1200',
    'Sadio Mané':'https://commons.wikimedia.org/wiki/Special:FilePath/Sadio_Mane_2018.jpg?width=1200'
  };
  var FLAGS = { NO:'Norway', FR:'France', AR:'Argentina', PT:'Portugal', EN:'England', BR:'Brazil', ES:'Spain', BE:'Belgium', EG:'Egypt', PL:'Poland', HR:'Croatia', KR:'South_Korea', DE:'Germany', UY:'Uruguay', SN:'Senegal', DZ:'Algeria', MA:'Morocco', GA:'Gabon', CI:"Cote_d'Ivoire", CM:'Cameroon', GH:'Ghana', GN:'Guinea', NL:'Netherlands', IT:'Italy', RS:'Serbia', GE:'Georgia', NG:'Nigeria', SE:'Sweden', PY:'Paraguay', CO:'Colombia', CA:'Canada', SI:'Slovenia', UA:'Ukraine' };
  var NAT_FR = { NO:'NORVÈGE', FR:'FRANCE', AR:'ARGENTINE', PT:'PORTUGAL', EN:'ANGLETERRE', BR:'BRÉSIL', ES:'ESPAGNE', BE:'BELGIQUE', EG:'ÉGYPTE', PL:'POLOGNE', HR:'CROATIE', KR:'CORÉE', DE:'ALLEMAGNE', UY:'URUGUAY', SN:'SÉNÉGAL', DZ:'ALGÉRIE', MA:'MAROC', GA:'GABON', CI:"CÔTE D'IVOIRE", CM:'CAMEROUN', GH:'GHANA', GN:'GUINÉE', NL:'PAYS-BAS', IT:'ITALIE', RS:'SERBIE', GE:'GÉORGIE', NG:'NIGERIA', SE:'SUÈDE', PY:'PARAGUAY', CO:'COLOMBIE', CA:'CANADA', SI:'SLOVÉNIE', UA:'UKRAINE' };
  var POS = { GK:'GARDIEN', DF:'DÉFENSEUR', MF:'MILIEU', AT:'ATTAQUANT' };
  var t = function(k){ return (window.STRIKR_t ? window.STRIKR_t(k) : k); };

  // Difficulty tiers, based on real-world notoriety. Most of the roster falls
  // through to 'medium' by default — only the true global superstars and the
  // clearly niche squad/role players are curated into 'easy' / 'hard'.
  var EASY_SET = {
    'Erling Haaland':1,'Kylian Mbappé':1,'Lionel Messi':1,'Cristiano Ronaldo':1,'Jude Bellingham':1,
    'Vinícius Júnior':1,'Kevin De Bruyne':1,'Mohamed Salah':1,'Harry Kane':1,'Robert Lewandowski':1,
    'Neymar Jr':1,'Karim Benzema':1,'Luka Modrić':1,'Antoine Griezmann':1,'Virgil van Dijk':1,
    'Toni Kroos':1,'Son Heung-min':1,'Phil Foden':1,'Bukayo Saka':1,'Pelé':1,'Diego Maradona':1,
    'Zinédine Zidane':1,'Ronaldo Nazário':1,'Ronaldinho':1,'Kaká':1,'Luís Figo':1,'Roberto Baggio':1,
    'Alessandro Del Piero':1,'Fabio Cannavaro':1,'Roberto Carlos':1,'Cafu':1,'Rivaldo':1,'Xabi Alonso':1,
    'Sergio Agüero':1,'David Silva':1,'Cesc Fàbregas':1,'Dani Alves':1,'Thiago Silva':1,'Thomas Müller':1,
    'Manuel Neuer':1,'Joshua Kimmich':1
  };
  var HARD_SET = {
    'Kalvin Phillips':1,'Conor Gallagher':1,'Levi Colwill':1,'Bradley Barcola':1,'Warren Zaïre-Emery':1,
    'Désiré Doué':1,'Rayan Cherki':1,'Michael Olise':1,'Mathys Tel':1,'Manu Koné':1,'Malo Gusto':1,
    'Ferland Mendy':1,'Nordi Mukiele':1,'Corentin Tolisso':1,'Wissam Ben Yedder':1,'Jonathan David':1,
    'Youri Djorkaeff Jr':1,'Rui Patrício':1,'Andrea Barzagli':1,'Emerson Palmieri':1,'Miguel Almirón':1,
    'Andriy Lunin':1,'Josip Iličić':1,'Charles De Ketelaere':1,'Serhou Guirassy':1,'Andrej Kramarić':1,
    'Wesley Fofana':1
  };
  function tierOf(name){ return EASY_SET[name] ? 'easy' : (HARD_SET[name] ? 'hard' : 'medium'); }
  var LEVELS = ['easy','medium','hard'];

  // Thematic categories — purely an optional narrowing filter on top of the
  // existing level system. When state.category is null (the default, and the
  // only path "Jouer maintenant" on Home ever takes) nothing here changes
  // behavior at all: poolForLevel returns exactly what it always did.
  var LIGUE1_CLUBS = { 'Paris Saint-Germain':1,'Olympique Lyonnais':1,'Lyon':1,'Marseille':1,'Lille':1,'AS Monaco':1,'Monaco':1,'Nice':1,'OGC Nice':1,'Rennes':1,'Nantes':1,'Bordeaux':1,'Lens':1,'Montpellier':1,'Toulouse':1,'Reims':1,'Strasbourg':1,"Saint-\u00c9tienne":1 };
  var CATEGORIES = {
    gk:      { emoji: '\uD83E\uDDE4', match: function(p){ return p.pos === 'GK'; } },
    forward: { emoji: '\u26BD', match: function(p){ return p.pos === 'AT'; } },
    legends: { emoji: '\uD83C\uDF1F', match: function(p){ return (p.dob||9999) <= 1990; } },
    ligue1:  { emoji: '\uD83C\uDDEB\uD83C\uDDF7', match: function(p){ return (p.clubs||[]).some(function(c){ return LIGUE1_CLUBS[c]; }); } },
  };
  var REWARD_TABLE = {
    easy:   { 1: 2, rest23: 1, rest4: 1 },
    medium: { 1: 3, rest23: 2, rest4: 1 },
    hard:   { 1: 6, rest23: 4, rest4: 2 },
  };
  function rewardFor(level, solvedAt){
    var t2 = REWARD_TABLE[level] || REWARD_TABLE.medium;
    return solvedAt === 1 ? t2[1] : (solvedAt <= 3 ? t2.rest23 : t2.rest4);
  }
  var PALETTE = ['#ff5a3c','#2b3ff2','#ffb03c','#a8f5c6','#7a2b52','#c9d8ff','#2a6f4d','#ffe66b','#ffcae0'];
  function stripAcc(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function clubColor(name){ var h=0; for(var i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffff; return PALETTE[h%PALETTE.length]; }
  function clubInit(name){ var w=(name||'').split(/\s+/).filter(Boolean); return (w.slice(0,2).map(function(x){return x[0];}).join('')).toUpperCase(); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  var state = null, root = null;

  function shieldHTML(clubName, size){
    size = size || 44;
    var radius = size >= 40 ? 10 : 8;
    var fs = size >= 40 ? 15 : 10;
    var known = LOGOS[clubName];
    // Always render a stable wrapper the observer can swap into.
    var placeholderInner = known
      ? '<img src="'+known+'" alt="'+esc(clubName)+'" style="width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box" onerror="this.style.display=\'none\'"/>'
      : '<div style="width:100%;height:100%;background:'+clubColor(clubName)+';display:flex;align-items:center;justify-content:center;font:900 '+fs+'px \'Inter Tight\';color:#fff">'+clubInit(clubName)+'</div>';
    return '<div class="strikr-shield" data-club="'+esc(clubName)+'" style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+'px;background:#fff;border:1.5px solid #1a1a1a;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">'+placeholderInner+'</div>';
  }

  function resolveShields(){
    if (!window.STRIKR_getClubLogo) return;
    var shields = document.querySelectorAll('.strikr-shield:not([data-strikr-resolved])');
    shields.forEach(function(el){
      var name = el.getAttribute('data-club');
      if (!name || LOGOS[name]) { el.setAttribute('data-strikr-resolved','static'); return; }
      el.setAttribute('data-strikr-resolved','pending');
      window.STRIKR_getClubLogo(name, function(url){
        if (!url) { el.setAttribute('data-strikr-resolved','none'); return; }
        LOGOS[name] = url;
        // Only mutate if the element is still in the DOM.
        if (!el.isConnected) { el.setAttribute('data-strikr-resolved','stale'); return; }
        el.innerHTML = '<img src="'+url+'" alt="'+name.replace(/"/g,'')+'" style="width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box"/>';
        el.setAttribute('data-strikr-resolved','done');
      });
    });
  }

  function skipOrForfeit(){
    if (!state) return;
    if (state.status !== 'playing') { promptLevelThenPick(); return; } // free once round is over
    var cost = 30;
    if (state.diamonds < cost) { flashLowDiamonds(); return; }
    state.diamonds -= cost;
    if (window.STRIKR_addDiamonds) window.STRIKR_addDiamonds(-cost);
    promptLevelThenPick();
  }

  function poolForLevel(level){
    var arr = [];
    for (var i=0;i<window.STRIKR_PLAYERS.length;i++){
      var p = window.STRIKR_PLAYERS[i];
      if (!p.clubs || p.clubs.length < 3) continue;
      if (tierOf(p.n) !== level) continue;
      if (state.category && CATEGORIES[state.category] && !CATEGORIES[state.category].match(p)) continue;
      arr.push(i);
    }
    if (arr.length) return arr;
    if (state.category) { // category+level combo too thin — drop the level constraint, keep the category
      var catOnly = [];
      for (var j=0;j<window.STRIKR_PLAYERS.length;j++){
        var pj = window.STRIKR_PLAYERS[j];
        if (pj.clubs && pj.clubs.length >= 3 && CATEGORIES[state.category].match(pj)) catOnly.push(j);
      }
      if (catOnly.length) return catOnly;
    }
    return state.fullPool; // final fallback: full roster
  }

  function promptLevelThenPick(){
    var host = document.getElementById('strikr-level-modal');
    if (!host) { pickPlayer(); return; } // shell not built yet (shouldn't happen)
    var labels = { easy: t('level_easy'), medium: t('level_medium'), hard: t('level_hard') };
    var colors = { easy: '#a8f5c6', medium: '#ffe66b', hard: '#ffcae0' };
    host.style.display = 'flex';
    host.innerHTML =
      '<div style="background:#fff8ee;border:2.5px solid #1a1a1a;border-radius:20px;padding:22px;box-shadow:6px 6px 0 #1a1a1a;max-width:320px;width:100%;text-align:center">'+
        '<div style="font:900 20px \'Inter Tight\';color:#1a1a1a;letter-spacing:-.01em">'+t('level_prompt_title')+'</div>'+
        '<div style="font:500 12px \'Space Grotesk\';color:rgba(0,0,0,.55);margin-top:6px">'+t('level_prompt_sub')+'</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">'+
          LEVELS.map(function(lv){
            return '<button type="button" data-strikr-level="'+lv+'" style="padding:14px;background:'+colors[lv]+';border:2px solid #1a1a1a;border-radius:12px;font:900 14px \'Inter Tight\';color:#1a1a1a;cursor:pointer;font-family:inherit;box-shadow:3px 3px 0 #1a1a1a">'+labels[lv]+'</button>';
          }).join('')+
        '</div>'+
      '</div>';
  }

  function pickPlayer(level){
    if (level) state.level = level;
    if (!state.level) state.level = 'medium';
    if (!state.remainingByLevel[state.level] || !state.remainingByLevel[state.level].length) {
      state.remainingByLevel[state.level] = poolForLevel(state.level).slice();
    }
    var pool = state.remainingByLevel[state.level];
    var idx = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    var p = window.STRIKR_PLAYERS[idx];
    state.player = p;
    state.revealed = Math.max(1, Math.min(3, p.clubs.length - 2));
    state.animateReveal = false;
    state.wrongList = []; state.status = 'playing'; state.guess = ''; state.solvedAt = null;
    state.hints = { nat:false, pos:false, age:false };
    var host = document.getElementById('strikr-level-modal');
    if (host) { host.style.display = 'none'; host.innerHTML = ''; }
    var inp = document.getElementById('strikr-input');
    if (inp) inp.value = '';
    renderAll();
  }

  function submit(){
    if (!state || state.status === 'won') return;
    var g = stripAcc((state.guess||'').trim().toLowerCase());
    if (!g) return;
    var p = state.player;
    var nameLc = stripAcc(p.n.toLowerCase());
    var lastLc = nameLc.split(' ').slice(-1)[0];
    if (g === nameLc || g === lastLc) {
      state.status = 'won'; state.solvedAt = state.revealed; state.revealed = p.clubs.length;
      var reward = rewardFor(state.level || 'medium', state.solvedAt);
      state.diamonds += reward;
      if (window.STRIKR_addDiamonds) window.STRIKR_addDiamonds(reward);
      if (window.STRIKR_fx) window.STRIKR_fx.win();
      renderAll(); return;
    }
    state.wrongList.push(state.guess.trim());
    state.guess = '';
    var inp = document.getElementById('strikr-input');
    if (inp) inp.value = '';
    state.revealed = Math.min(state.revealed + 1, p.clubs.length);
    state.animateReveal = true;
    if (window.STRIKR_fx) window.STRIKR_fx.wrong();
    renderAll();
  }

  function renderCards(){
    var host = document.getElementById('strikr-cards');
    if (!host || !state.player) return;
    var p = state.player;
    // Compact size when many clubs so all fit without heavy scroll
    var many = p.clubs.length >= 6;
    var shieldSize = many ? 32 : 40;
    var pad = many ? 5 : 6;
    var titleFs = many ? 12 : 13;
    var html = '';
    for (var i=0;i<p.clubs.length;i++){
      var c = p.clubs[i];
      var revealed = i < state.revealed;
      if (revealed) {
        html += '<div style="display:flex;align-items:center;gap:8px;padding:'+pad+'px;background:#fff;border:2px solid #1a1a1a;border-radius:12px;box-shadow:3px 3px 0 #1a1a1a">'+shieldHTML(c,shieldSize)+'<div style="flex:1;min-width:0"><div style="font:900 '+titleFs+'px \'Inter Tight\';color:#1a1a1a;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c)+'</div><div style="font:700 8px \'JetBrains Mono\';color:rgba(0,0,0,.5);letter-spacing:.06em;margin-top:1px">CLUB '+(i+1)+'</div></div><div style="width:20px;height:20px;border-radius:99px;background:#a8f5c6;border:1.5px solid #1a1a1a;display:flex;align-items:center;justify-content:center;font:900 11px;color:#1a1a1a;flex-shrink:0">✓</div></div>';
      } else {
        html += '<div style="display:flex;align-items:center;gap:8px;padding:'+pad+'px;background:repeating-linear-gradient(45deg,#fff8ee,#fff8ee 6px,#f0eadf 6px,#f0eadf 12px);border:2px dashed rgba(0,0,0,.25);border-radius:12px"><div style="width:'+shieldSize+'px;height:'+shieldSize+'px;border-radius:8px;background:#fff;border:2px dashed rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font:900 '+(shieldSize>=40?16:13)+'px \'Inter Tight\';color:rgba(0,0,0,.25);flex-shrink:0">?</div><div style="flex:1"><div style="font:800 '+(titleFs-1)+'px \'Inter Tight\';color:rgba(0,0,0,.35)">'+t('game_locked_club')+'</div><div style="font:600 8px \'JetBrains Mono\';color:rgba(0,0,0,.25);margin-top:1px">'+t('game_sticker')+' #'+(i+1)+'</div></div></div>';
      }
    }
    host.innerHTML = html;
  }

  function renderWrongs(){
    var host = document.getElementById('strikr-wrongs');
    if (!host) return;
    host.innerHTML = state.wrongList.map(function(w){
      return '<div style="padding:3px 9px;background:#ffd6d0;border:1.5px solid #1a1a1a;border-radius:99px;font:700 9px \'Space Grotesk\';color:#1a1a1a">✕ '+esc(w)+'</div>';
    }).join('');
  }

  function renderHeader(){
    var el = document.getElementById('strikr-reveal-count');
    if (el && state.player) el.textContent = state.revealed + ' / ' + state.player.clubs.length + ' ' + t('game_reveal_count');
    var d = document.getElementById('strikr-diamonds');
    if (d) d.textContent = '💎 ' + state.diamonds;
    var catBadge = document.getElementById('strikr-category-badge');
    if (catBadge) {
      if (state.category && CATEGORIES[state.category]) {
        catBadge.style.display = 'inline-flex';
        var lbl = catBadge.querySelector('.strikr-cat-label');
        if (lbl) lbl.textContent = CATEGORIES[state.category].emoji + ' ' + t('category_' + state.category);
      } else {
        catBadge.style.display = 'none';
      }
    }
  }

  window.STRIKR_setCategory = function(catId){
    if (!state) { window.__strikrPendingCategory = catId; return; }
    state.category = catId || null;
    state.remainingByLevel = {};
    pickPlayer();
  };

  function clearCategory(){
    if (!state) return;
    state.category = null;
    state.remainingByLevel = {};
    pickPlayer();
  }

  var HINT_COSTS = { nat: 30, pos: 20, age: 30 };

  function buyHint(kind){
    if (!state || state.status === 'won') return;
    if (state.hints[kind]) return;
    var cost = HINT_COSTS[kind]||0;
    if (state.diamonds < cost) { flashLowDiamonds(); return; }
    state.diamonds -= cost;
    state.hints[kind] = true;
    if (window.STRIKR_addDiamonds) window.STRIKR_addDiamonds(-cost);
    if (window.STRIKR_fx) window.STRIKR_fx.coin();
    renderAll();
  }

  function flashLowDiamonds(){
    var d = document.getElementById('strikr-diamonds');
    if (!d) return;
    d.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}], {duration:280});
    d.style.background = '#ffd6d0';
    setTimeout(function(){ d.style.background = '#a8f5c6'; }, 500);
  }

  function renderHints(){
    var host = document.getElementById('strikr-hints');
    if (!host || !state.player) return;
    var p = state.player;
    var flag = FLAGS[p.nat] ? 'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_'+encodeURIComponent(FLAGS[p.nat])+'.svg?width=48' : '';
    var natLabel = NAT_FR[p.nat] || p.nat || '?';
    var posLabel = POS[p.pos] || p.pos || '?';
    var age = p.dob ? (2026 - parseInt(p.dob,10)) : '?';
    function chip(kind, icon, label, revealedContent){
      if (state.hints[kind]) {
        return '<div style="padding:5px 9px;background:#1a1a1a;color:#ffe66b;border:1.5px solid #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';display:inline-flex;align-items:center;gap:5px">'+revealedContent+'</div>';
      }
      var afford = state.diamonds >= HINT_COSTS[kind];
      var bg = afford ? '#fff' : '#f0eadf';
      var op = afford ? '1' : '.5';
      return '<button type="button" data-strikr-action="hint" data-strikr-hint="'+kind+'" style="padding:5px 9px;background:'+bg+';border:1.5px dashed #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';color:#1a1a1a;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;opacity:'+op+'">'+icon+' '+label+' <span style="padding:1px 5px;background:#a8f5c6;border:1px solid #1a1a1a;border-radius:99px;font:800 8px \'JetBrains Mono\'">💎'+HINT_COSTS[kind]+'</span></button>';
    }
    var natReveal = (flag?'<img src="'+flag+'" alt="flag" style="width:18px;height:13px;border-radius:2px;object-fit:cover;border:1px solid rgba(255,255,255,.2)" onerror="this.style.display=\'none\'"/>':'')+esc(natLabel);
    host.innerHTML =
      '<div style="font:700 9px \'JetBrains Mono\';color:rgba(0,0,0,.45);letter-spacing:.12em;margin-bottom:5px">'+t('game_hints_label')+'</div>'+
      '<div style="display:flex;gap:5px;flex-wrap:wrap">'+
        chip('nat','🌍',t('hint_nat'), natReveal)+
        chip('pos','⚽',t('hint_pos'), esc(posLabel))+
        chip('age','🎂',t('hint_age'), age+' '+t('hint_age_suffix'))+
      '</div>';
  }

  function renderSuggestions(){
    var host = document.getElementById('strikr-suggest');
    if (!host) return;
    var q = stripAcc((state.guess||'').trim().toLowerCase());
    if (q.length < 2 || state.status === 'won') { host.innerHTML = ''; host.style.display = 'none'; return; }
    var out = [];
    for (var i = 0; i < window.STRIKR_PLAYERS.length && out.length < 6; i++) {
      var p = window.STRIKR_PLAYERS[i];
      var nL = stripAcc(p.n.toLowerCase());
      if (nL.indexOf(q) > -1) out.push(p.n);
    }
    if (!out.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = 'block';
    host.innerHTML = out.map(function(n){
      return '<button type="button" data-strikr-action="pick" data-strikr-name="'+esc(n)+'" style="display:block;width:100%;text-align:left;padding:9px 14px;background:#fff;border:none;border-bottom:1px solid rgba(0,0,0,.06);font:700 13px \'Inter Tight\';color:#1a1a1a;cursor:pointer;font-family:inherit">'+esc(n)+'</button>';
    }).join('');
  }

  function renderWin(){
    var host = document.getElementById('strikr-win');
    if (!host) return;
    if (state.status !== 'won') { host.style.display = 'none'; host.innerHTML = ''; return; }
    var p = state.player;
    var parts = p.n.split(' ');
    var lastName = parts.slice(-1)[0].toUpperCase();
    var firstName = parts.slice(0, -1).join(' ');
    var init = ((parts[0]||'')[0]||'') + ((parts.slice(-1)[0]||'')[0]||'');
    init = init.toUpperCase();
    var photo = PHOTOS[p.n];
    var flag = FLAGS[p.nat] ? 'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_'+encodeURIComponent(FLAGS[p.nat])+'.svg?width=60' : '';
    var natLabel = NAT_FR[p.nat] || p.nat || '';
    var posLabel = POS[p.pos] || p.pos || '';
    var diamonds = state.solvedAt === 1 ? 3 : (state.solvedAt <= 3 ? 2 : 1);
    var solveOrd = (t('ordinals'))[state.solvedAt - 1] || '';
    var portraitSrc = photo || '';
    var portrait = '<div class="strikr-portrait-photo" data-player="'+esc(p.n)+'" style="position:relative;width:200px;height:200px">'+
      '<div style="position:absolute;inset:0;border-radius:99px;background:conic-gradient(from 45deg,#2b3ff2,#ff5a3c,#ffe66b,#a8f5c6,#2b3ff2);padding:6px;box-shadow:6px 6px 0 #1a1a1a">'+
        '<div style="width:100%;height:100%;border-radius:99px;background:linear-gradient(135deg,#1a1a1a,#3a3a3a);overflow:hidden;border:3px solid #1a1a1a;display:flex;align-items:center;justify-content:center;position:relative">'+
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 56px \'Inter Tight\';color:#ffe66b;letter-spacing:-.03em">'+esc(init)+'</div>'+
          '<img src="'+portraitSrc+'" alt="'+esc(p.n)+'" style="position:relative;width:100%;height:100%;object-fit:cover;object-position:center 20%;filter:contrast(1.06) saturate(1.1);mask-image:radial-gradient(ellipse 75% 90% at center 42%,#000 65%,transparent 100%);-webkit-mask-image:radial-gradient(ellipse 75% 90% at center 42%,#000 65%,transparent 100%);background:#fff8ee" onerror="this.style.opacity=\'0\'"/>'+
        '</div>'+
      '</div>'+
    '</div>';
    var flagPill = flag ? '<span style="padding:4px 10px 4px 4px;background:#1a1a1a;color:#fff;border-radius:99px;font:700 10px \'JetBrains Mono\';display:inline-flex;align-items:center;gap:6px"><img src="'+flag+'" alt="flag" style="width:22px;height:16px;border-radius:2px;object-fit:cover;border:1px solid rgba(255,255,255,.2)" onerror="this.style.display=\'none\'"/>'+esc(natLabel)+'</span>' : '';
    var strip = p.clubs.map(function(c,i){ return (i>0?'<div style="color:rgba(0,0,0,.3);font:800 12px \'JetBrains Mono\'">→</div>':'')+shieldHTML(c,36); }).join('');

    host.style.display = 'flex';
    host.innerHTML =
      '<div style="position:absolute;top:60px;left:30px;width:10px;height:10px;background:#2b3ff2;border-radius:99px"></div>'+
      '<div style="position:absolute;top:100px;right:40px;width:14px;height:14px;background:#a8f5c6;border:2px solid #1a1a1a;border-radius:99px"></div>'+
      '<div style="position:absolute;top:180px;left:60px;width:8px;height:8px;background:#fff;border:2px solid #1a1a1a;border-radius:99px"></div>'+
      '<div style="position:absolute;top:80px;left:120px;font-size:22px">✨</div>'+
      '<div style="position:absolute;top:250px;right:70px;font-size:20px">⭐</div>'+
      '<div style="padding:16px 22px 0;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2">'+
        '<div style="padding:5px 10px;background:#1a1a1a;color:#ffe66b;border-radius:99px;font:800 10px \'JetBrains Mono\';letter-spacing:.18em">'+t('game_found')+'</div>'+
        '<button type="button" data-strikr-action="skip" style="padding:6px 12px;background:#fff;border:2px solid #1a1a1a;border-radius:99px;font:900 10px \'Inter Tight\';color:#1a1a1a;box-shadow:2px 2px 0 #1a1a1a;cursor:pointer;font-family:inherit">'+t('game_new')+'</button>'+
      '</div>'+
      '<div style="padding:22px 22px 6px;display:flex;flex-direction:column;align-items:center;position:relative;z-index:2">'+portrait+
        '<div style="font:700 10px \'JetBrains Mono\';color:#1a1a1a;letter-spacing:.22em;margin-top:16px">✦ '+t('game_found_at')+' '+solveOrd+' '+t('game_found_club')+' ✦</div>'+
        '<div style="font:900 26px/1 \'Inter Tight\';color:#1a1a1a;margin-top:8px;letter-spacing:-.02em;text-align:center">'+esc(firstName)+' <span style="color:#2b3ff2">'+esc(lastName)+'</span></div>'+
        '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;justify-content:center">'+flagPill+'<span style="padding:4px 10px;background:#fff;border:2px solid #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';color:#1a1a1a">'+esc(posLabel)+'</span><span style="padding:4px 10px;background:#fff;border:2px solid #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';color:#1a1a1a">'+esc(p.dob)+'</span></div>'+
      '</div>'+
      '<div style="padding:12px 22px 0;position:relative;z-index:2">'+
        '<div style="font:700 10px \'JetBrains Mono\';color:rgba(26,26,26,.7);letter-spacing:.18em;margin-bottom:6px">'+t('game_career')+' · '+p.clubs.length+' '+t('game_clubs')+'</div>'+
        '<div style="background:#fff;border:2.5px solid #1a1a1a;border-radius:14px;padding:8px;box-shadow:4px 4px 0 #1a1a1a;display:flex;flex-wrap:wrap;gap:5px;align-items:center;justify-content:center">'+strip+'</div>'+
      '</div>'+
      '<div style="padding:12px 22px 0;display:flex;gap:8px;position:relative;z-index:2">'+
        '<div style="flex:1;background:#a8f5c6;border:2.5px solid #1a1a1a;border-radius:12px;padding:10px 6px;text-align:center;box-shadow:3px 3px 0 #1a1a1a"><div style="font:900 20px \'Inter Tight\';color:#1a1a1a">💎+'+diamonds+'</div><div style="font:700 9px \'JetBrains Mono\';color:rgba(0,0,0,.55);letter-spacing:.08em;margin-top:2px">'+t('game_gems')+'</div></div>'+
        '<div style="flex:1;background:#fff;border:2.5px solid #1a1a1a;border-radius:12px;padding:10px 6px;text-align:center;box-shadow:3px 3px 0 #1a1a1a"><div style="font:900 20px \'Inter Tight\';color:#1a1a1a">+250</div><div style="font:700 9px \'JetBrains Mono\';color:rgba(0,0,0,.55);letter-spacing:.08em;margin-top:2px">'+t('game_xp')+'</div></div>'+
        '<div style="flex:1;background:#1a1a1a;color:#fff;border:2.5px solid #1a1a1a;border-radius:12px;padding:10px 6px;text-align:center;box-shadow:3px 3px 0 #ff5a3c"><div style="font:900 20px \'Inter Tight\'">🔥 8</div><div style="font:700 9px \'JetBrains Mono\';opacity:.7;letter-spacing:.08em;margin-top:2px">'+t('game_streak')+'</div></div>'+
      '</div>'+
      '<div style="padding:14px 22px 26px;display:flex;gap:8px;margin-top:auto;position:relative;z-index:2">'+
        '<button type="button" style="flex:1;padding:14px;background:#fff;border:2.5px solid #1a1a1a;border-radius:14px;font:900 12px \'Inter Tight\';color:#1a1a1a;box-shadow:3px 3px 0 #1a1a1a;cursor:pointer;font-family:inherit">'+t('game_share')+'</button>'+
        '<button type="button" data-strikr-action="skip" style="flex:1.4;padding:14px;background:#2b3ff2;color:#fff;border:2.5px solid #1a1a1a;border-radius:14px;font:900 13px \'Inter Tight\';letter-spacing:.02em;text-transform:uppercase;box-shadow:3px 3px 0 #1a1a1a;cursor:pointer;font-family:inherit">'+t('game_next')+'</button>'+
      '</div>';
  }

  function renderSkipBtn(){
    var btn = document.getElementById('strikr-skip-btn');
    if (!btn || !state) return;
    if (state.status === 'playing') {
      btn.innerHTML = '↻ 30💎';
      btn.title = t('game_forfeit_title');
    } else {
      btn.innerHTML = '↻';
      btn.title = t('game_new_player');
    }
  }

  function renderAll(){
    renderHeader();
    renderCards();
    renderHints();
    renderWrongs();
    renderSuggestions();
    renderWin();
    renderSkipBtn();
    setTimeout(resolveShields, 0);
    setTimeout(resolvePortrait, 0);
  }

  function resolvePortrait(){
    if (!window.STRIKR_getPlayerPhoto) return;
    var el = document.querySelector('.strikr-portrait-photo:not([data-strikr-resolved])');
    if (!el || !state.player) return;
    var name = el.getAttribute('data-player');
    if (!name) return;
    if (PHOTOS[name]) {
      el.setAttribute('data-strikr-resolved','static');
      return;
    }
    el.setAttribute('data-strikr-resolved','pending');
    window.STRIKR_getPlayerPhoto(name, function(url){
      if (!url || !el.isConnected) { el.setAttribute('data-strikr-resolved','none'); return; }
      PHOTOS[name] = url;
      var img = el.querySelector('img');
      if (img) { img.src = url; }
      el.setAttribute('data-strikr-resolved','done');
    });
  }

  function buildShell(){
    root.innerHTML =
      '<div style="height:56px;flex-shrink:0"></div>'+
      '<div style="padding:8px 20px 4px;position:relative">'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<div style="font:700 10px \'JetBrains Mono\';color:#ff5a3c;letter-spacing:.14em;text-transform:uppercase">'+t('game_kicker')+'</div>'+
          '<div style="display:flex;gap:5px">'+
            '<div style="padding:4px 9px;background:#ffe66b;border:2px solid #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';color:#1a1a1a">🔥 7</div>'+
            '<div id="strikr-diamonds" style="padding:4px 9px;background:#a8f5c6;border:2px solid #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';color:#1a1a1a;transition:background .2s">💎 320</div>'+
          '</div>'+
        '</div>'+
        '<div style="font:900 26px/1 \'Inter Tight\';color:#1a1a1a;margin-top:8px;letter-spacing:-.02em">'+t('game_title_pre')+'<span style="color:#ff5a3c">'+t('game_title_accent')+'</span>'+t('game_title_suf')+'</div>'+
        '<div id="strikr-reveal-count" style="font:500 12px/1.3 \'Space Grotesk\';color:rgba(0,0,0,.5);margin-top:4px">…</div>'+
      '<button type="button" id="strikr-category-badge" data-strikr-action="clear-category" style="display:none;align-items:center;gap:5px;margin-top:6px;padding:4px 10px;background:#c9d8ff;border:2px solid #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';color:#1a1a1a;cursor:pointer;font-family:inherit"><span class="strikr-cat-label"></span><span>✕</span></button>'+
      '</div>'+
      '<div id="strikr-cards" style="flex:1;overflow:auto;padding:8px 20px 2px;display:flex;flex-direction:column;gap:5px;min-height:0"></div>'+
      '<div id="strikr-hints" style="padding:6px 20px 0"></div>'+
      '<div id="strikr-wrongs" style="padding:6px 20px 0;display:flex;gap:5px;flex-wrap:wrap"></div>'+
      '<div style="padding:8px 20px 22px;position:relative">'+
        '<div id="strikr-suggest" style="position:absolute;bottom:calc(100% + 6px);left:20px;right:20px;background:#fff;border:2px solid #1a1a1a;border-radius:12px;box-shadow:3px 3px 0 #1a1a1a;overflow:hidden;z-index:10;max-height:220px;overflow-y:auto;display:none"></div>'+
        '<div style="background:#fff;border:2px solid #1a1a1a;border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:9px;box-shadow:3px 3px 0 #1a1a1a">'+
          '<span style="font-size:15px">✏️</span>'+
          '<input id="strikr-input" type="text" placeholder="'+t('game_input_placeholder')+'" style="flex:1;background:transparent;border:none;color:#1a1a1a;font:700 14px \'Inter Tight\';outline:none;font-family:inherit" autocomplete="off"/>'+
        '</div>'+
        '<div style="display:flex;gap:6px;margin-top:8px">'+
                    '<button type="button" id="strikr-skip-btn" data-strikr-action="skip" title="'+t('game_new_player')+'" style="padding:12px 14px;background:#fff;color:#1a1a1a;border:2px solid #1a1a1a;border-radius:12px;font:900 14px \'Inter Tight\';box-shadow:3px 3px 0 #1a1a1a;cursor:pointer;font-family:inherit">↻</button>'+
          '<button type="button" data-strikr-action="submit" style="flex:1;padding:12px;background:#ff5a3c;color:#fff;border:2px solid #1a1a1a;border-radius:12px;font:900 13px \'Inter Tight\';letter-spacing:.02em;text-transform:uppercase;box-shadow:3px 3px 0 #1a1a1a;cursor:pointer;font-family:inherit">'+t('game_send')+'</button>'+
        '</div>'+
      '</div>'+
      '<div id="strikr-win" class="pop" style="position:absolute;inset:0;z-index:20;background:linear-gradient(180deg,#ff5a3c 0%,#ffb03c 55%,#ffe66b 100%);display:none;flex-direction:column;overflow:auto;padding-top:56px"></div>'+
      '<div id="strikr-level-modal" style="position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:24px"></div>';
  }

  function attachEvents(){
    root.addEventListener('click', function(e){
      var lvlBtn = e.target.closest && e.target.closest('[data-strikr-level]');
      if (lvlBtn) { pickPlayer(lvlBtn.getAttribute('data-strikr-level')); return; }
    });
    root.addEventListener('input', function(e){
      if (e.target && e.target.id === 'strikr-input') {
        state.guess = e.target.value;
        renderSuggestions();
      }
    });
    root.addEventListener('keydown', function(e){
      if (e.target && e.target.id === 'strikr-input' && e.key === 'Enter') {
        e.preventDefault(); submit();
      }
    });
    root.addEventListener('click', function(e){
      var t = e.target;
      while (t && t !== root && !t.getAttribute('data-strikr-action')) t = t.parentElement;
      if (!t || t === root) return;
      var action = t.getAttribute('data-strikr-action');
      if (action === 'submit') submit();
      else if (action === 'skip') skipOrForfeit();
      else if (action === 'clear-category') clearCategory();
      else if (action === 'hint') buyHint(t.getAttribute('data-strikr-hint'));
      else if (action === 'pick') {
        var name = t.getAttribute('data-strikr-name') || '';
        state.guess = name;
        var inp = document.getElementById('strikr-input');
        if (inp) inp.value = name;
        submit();
      }
    });
  }

  function init(){
    if (!window.STRIKR_PLAYERS || !window.STRIKR_PLAYERS.length) return setTimeout(init, 120);
    root = document.getElementById('strikr-game');
    if (!root) return setTimeout(init, 120);
    if (root.hasAttribute('data-strikr-init')) return;
    root.setAttribute('data-strikr-init', '1');
    // Only keep players with 3+ clubs — otherwise the guess-by-career mechanic doesn't work
    var pool = [];
    for (var i=0;i<window.STRIKR_PLAYERS.length;i++){
      if (window.STRIKR_PLAYERS[i].clubs && window.STRIKR_PLAYERS[i].clubs.length >= 3) pool.push(i);
    }
    state = { remainingByLevel: {}, fullPool: pool, level: null, category: (window.__strikrPendingCategory || null), diamonds: (window.STRIKR_getDiamonds ? window.STRIKR_getDiamonds() : 320), streak: 7, hints: { nat:false, pos:false, age:false } };
    window.__strikrPendingCategory = null;
    if (!pool.length) { console.warn('[strikr] no players with 3+ clubs'); return; }
    if (window.STRIKR_onDiamondsChanged) {
      window.STRIKR_onDiamondsChanged(function(balance){
        if (!state) return;
        state.diamonds = balance;
        renderHeader();
      });
    }
    buildShell();
    attachEvents();
    promptLevelThenPick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Retry init periodically in case DC re-mounts the container
  setInterval(function(){
    var el = document.getElementById('strikr-game');
    if (el && !el.hasAttribute('data-strikr-init')) init();
  }, 500);
})();
