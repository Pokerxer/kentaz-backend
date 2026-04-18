require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ── RAW DATA: [sku, csvCategory, name, stock, price, costPrice]
const RAW = [
  // ABAYAS
  ['219142711100','ABAYAS','Sky Blue Chinese Stoned Abaya',5,180000,180000],
  ['219143011102','ABAYAS','Chinese White Side Sequin Abaya',4,220000,220000],
  ['219141811104','ABAYAS','Free Gown Abaya',3,110000,110000],
  ['219143111015','ABAYAS','Brown Stoned Abaya',4,75500,75500],
  ['219142111082','ABAYAS','Black Beaded Abaya',3,75500,75500],
  ['219141311101','ABAYAS','2-Piece Abaya',4,125000,125000],
  ['219141211104','ABAYAS','Brown Abaya',4,95000,95000],
  ['219149111057','ABAYAS','White Stoned Abaya',1,95000,95000],
  ['219146111040','ABAYAS','Printed Abaya',3,65000,65000],
  ['219145111031','ABAYAS','Pattern Stoned Abaya',3,75500,75500],
  ['219144111068','ABAYAS','Black Stoned Suede Abaya',2,80000,80000],
  ['219141511100','ABAYAS','Green Abaya',5,95000,95000],
  ['219141411104','ABAYAS','Black & Green Abaya',4,90000,90000],
  ['219141611101','ABAYAS','Grey Stoned Abaya',5,95000,95000],
  ['219142911106','ABAYAS','Sea Green Chinese Stoned Abaya',5,180000,180000],
  ['219142811104','ABAYAS','Black & Flowery Chinese Stoned Abaya',5,180000,180000],
  ['219142611108','ABAYAS','Blue Tony Full Abaya Size L',1,85000,85000],
  ['219142511105','ABAYAS','Yellow Tony Full Abaya Size XL',1,85000,85000],
  ['219142411109','ABAYAS','Grey Tony Full Abaya Size L',1,85000,85000],
  ['219142311107','ABAYAS','Black Tony Full Abaya Size L',1,85000,85000],
  ['219142011108','ABAYAS','Green Tony Full Abaya Size L',1,85000,85000],
  ['219141911102','ABAYAS','Red Tony Full Abaya M XL',2,85000,85000],
  ['219141711105','ABAYAS','Purple Long Gown',3,175000,175000],
  ['219141111098','ABAYAS','3-in-1 Peach Abaya',3,155000,155000],
  ['219148111047','ABAYAS','Designed Hand Stoned Abaya',1,75000,75000],
  // ACCESSORIES
  ['219127111026','ACCESORIES','Multi Colors Earrings',110,15000,15000],
  ['219121611103','ACCESORIES','Hand Fan',7,35000,35000],
  ['219128111084','ACCESORIES','Spring Belt',13,35000,35000],
  ['219121511102','ACCESORIES','Labubu Teddy Bear',6,75000,75000],
  ['219126111091','ACCESORIES','Brooch',11,18000,18000],
  ['219123111078','ACCESORIES','Gold Pearl Earring',2,20000,20000],
  ['219122111040','ACCESORIES','Bangle Set',1,40000,40000],
  ['219121411101','ACCESORIES','Pearl Black & White Plain Key Holder',5,35000,35000],
  ['219121311107','ACCESORIES','Silver Charm Key Holder',2,35000,35000],
  ['219121211101','ACCESORIES','Teddy Bear & Pearl Key Holder',6,48000,48000],
  ['219121111108','ACCESORIES','Phone Case Short Flat Glittery Holder',9,30000,30000],
  ['219121011100','ACCESORIES','Square Round Heart Shaped Mirror Key Holder',7,50000,50000],
  ['219129111011','ACCESORIES','Phone Case Short Round Glittery Holder',9,30000,30000],
  // BAGS
  ['219224011108','BAGS','Bessie Red Bag',1,90500,90500],
  ['219223911103','BAGS','Bessie Black Bag',1,90500,90500],
  ['219223711100','BAGS','Brown Capone Handbag',1,55000,55000],
  ['219221111032','BAGS','Luxury Chinese Bag',6,285000,285000],
  ['219223811100','BAGS','Black & Flowery Capone Handbag',1,55000,55000],
  ['219223611107','BAGS','Leopard Capone Handbag',2,55000,55000],
  ['219223511106','BAGS','Multicolored Capone Handbag',1,55000,55000],
  ['219223411101','BAGS','Black Capone Handbag',2,55000,55000],
  ['219223311100','BAGS','Beige & Flowery Capone Bag',2,48000,48000],
  ['219223211109','BAGS','Black & Flowery Capone Bag',1,48000,48000],
  ['219223111104','BAGS','White With Gold Chain Bag',1,45000,45000],
  ['219223011104','BAGS','Peach Color Purse',1,35000,35000],
  ['219228111055','BAGS','Diff Colored Sling Bag Small',4,45000,45000],
  ['219222911109','BAGS','Stoned Lightweight Purse Pink',1,55000,55000],
  ['219222811108','BAGS','Stoned Lightweight Purse Black',2,55000,55000],
  ['219222711107','BAGS','Stoned Magnetic Piece Black Silver',2,90000,90000],
  ['219222611109','BAGS','Stoned Magnetic Piece Blue',2,90000,90000],
  ['219222511106','BAGS','Stoned Magnetic Piece Pink',2,90000,90000],
  ['219222311100','BAGS','Stoned Magnetic Piece Green Silver',2,90000,90000],
  ['219222211109','BAGS','Stoned Magnetic Piece Gold',2,90000,90000],
  ['219222111100','BAGS','Stoned Embellished Bridal Purse Black',2,120000,120000],
  ['219222011103','BAGS','Stoned Embellished Bridal Purse Pink',2,120000,120000],
  ['219221911101','BAGS','Stoned Embellished Bridal Purse Red',2,120000,120000],
  ['219221811101','BAGS','Stoned Embellished Bridal Purse Silver',4,120000,120000],
  ['219221711108','BAGS','Stoned Embellished Bridal Purse Gold',4,120000,120000],
  ['219227111019','BAGS','Ivory Steve Madden Bag',1,130000,130000],
  ['219226111093','BAGS','Black Aldo Curved Bag & Chain',1,120000,120000],
  ['219225111014','BAGS','Brown Aldo Curved Bag & Charm',1,125000,125000],
  ['219224111044','BAGS','Black Aldo Bag & Charm',1,120000,120000],
  ['219223111051','BAGS','Olive Green Steve Madden Bag',1,130000,130000],
  ['219222111031','BAGS','Aldo Bag With Black Chain',1,120000,120000],
  // BAGS – misplaced shoes (redirected to Shoes)
  ['219221111100','BAGS','Umut Brown Lidans Men Shoe Size 43',1,120000,120000],
  ['219221611108','BAGS','Umut Black Shoe With Rope Design Red Black Size 41',1,95000,95000],
  ['219221411109','BAGS','Black Flat Stoned Sandals Size 39-42',5,35000,35000],
  ['219221111108','BAGS','Black Cube Roped Shoes Size 42',1,90000,90000],
  ['219221011108','BAGS','Umut Classic Black Alligator Suede Size 44 41',2,105000,105000],
  ['219229111093','BAGS','Umut Classic Shoes Suede Brown Size 41 43',2,95000,95000],
  // BEAUTY
  ['219151111017','BEAUTY','Facial Hair Remover',4,75000,75000],
  // BODY CREAM
  ['219111111101','BODY CREAM','Knuckles Away Cream',2,20000,20000],
  ['219117111040','BODY CREAM','Anti-Aging Cream',6,35000,35000],
  ['219111111010','BODY CREAM','Luxury Ivory Body Milk',3,35000,35000],
  ['219113111076','BODY CREAM','Super Deluxe Whitening Body Milk',1,35000,35000],
  ['219112111092','BODY CREAM','Half Caste Body Milk',1,33000,33000],
  ['219115111080','BODY CREAM','Hot Chocolate Body Cream',4,28000,28000],
  ['219118111005','BODY CREAM','SPF Moisturizer',1,35000,35000],
  ['219116111037','BODY CREAM','Body Repair Glow Cream',3,35000,35000],
  // CAPS
  ['219351111029','CAPS','Face Cap',4,45000,45000],
  ['219352111004','CAPS','Callaway Head Warmer',1,45000,45000],
  // CHILDREN
  ['219179111030','CHILDREN','Kids Male Suit Set',28,125000,125000],
  ['219171111107','CHILDREN','Red Lacey Tutu Gown',5,48500,48500],
  ['219171011103','CHILDREN','Loro Piana Kids Shoes',11,130000,130000],
  ['219173111090','CHILDREN','Crazy Top With Fringe Cuts',5,36000,36000],
  ['219178111079','CHILDREN','Pink Christian Dior Gown Without Hoodie',1,50000,50000],
  ['219177111055','CHILDREN','Pink Christian Dior Gown With Hoodie',1,50000,50000],
  ['219176111058','CHILDREN','Pink Prada Gown',1,50000,50000],
  ['219175111085','CHILDREN','Cream Christian Dior Gown Without Hoodie',1,50000,50000],
  ['219174111033','CHILDREN','Cream Christian Dior Gown With Hoodie',1,50000,50000],
  ['219172111045','CHILDREN','Kiddies Leggings',20,28500,28500],
  ['219171111005','CHILDREN',"Children's Purse",14,18000,18000],
  // CHINA WEARS
  ['219211011100','CHINA WEARS','Finelong Sky Blue Pant Suit Set',2,110000,110000],
  ['219219111064','CHINA WEARS','Finelong Black Blazer With Gold Zip',1,65000,65000],
  ['219217111051','CHINA WEARS','Finelong Black Long Double Breasted Blazer XL XXL',2,65000,65000],
  ['219215111050','CHINA WEARS','Finelong Pink Blazer Pixel Button XL 2XL',1,65000,65000],
  ['219218111069','CHINA WEARS','Finelong White Single Button Blazer XL',1,70000,70000],
  ['219216111067','CHINA WEARS','Finelong Multicolored Double Breasted Blazer XL',1,65000,65000],
  ['6381418653788','CHINA WEARS','Finelong Royal Blue Double Breasted Pant Set L XL 2XL',4,110000,110000],
  ['219212111017','CHINA WEARS','Plain Gold Leather Jacket',2,110000,110000],
  ['219211111031','CHINA WEARS','Stoned Gold Leather Jacket',1,110000,110000],
  // CLEANSERS
  ['219741110361','CLEANSERS','Facial Glow Cleanser',3,23000,23000],
  ['219711110704','CLEANSERS','Hydrating Rose Water',5,20000,20000],
  ['219721110439','CLEANSERS','Cleanser for Spots & Sunburn',10,20000,20000],
  ['219761110177','CLEANSERS','Knuckles Away Cleanser',3,23000,23000],
  ['219731110781','CLEANSERS','3D Lightening Face Cleanser',2,23000,23000],
  ['219751110509','CLEANSERS','Face Solution for Pimple & Breakout',2,23000,23000],
  // FACE CREAM
  ['219102111038','FACE CREAM','Half Caste Face Cream',1,25000,25000],
  ['219104111008','FACE CREAM','Sun Burn Removal Cream',1,15000,15000],
  ['219101111071','FACE CREAM','Luxury Face Glow Cream',2,25000,25000],
  ['219103111018','FACE CREAM','Hot Chocolate Face Cream',1,25000,25000],
  // GIFT BOX
  ['219262111062','GIFT BOX','Calvin Klein Socks Gift Box',1,40000,40000],
  ['219268111092','GIFT BOX','Biioni Socks Gift Box',1,40000,40000],
  ['219267111090','GIFT BOX','Bogaro Socks Gift Box',1,40000,40000],
  ['219266111069','GIFT BOX','Giorgio Armani Socks Gift Box',2,40000,40000],
  ['219265111039','GIFT BOX','Cesare Paciotti Socks Gift Box',1,40000,40000],
  ['219264111097','GIFT BOX','Hermes Socks Gift Box',1,40000,40000],
  ['219263111030','GIFT BOX','Paul & Shark Socks Gift Box',1,40000,40000],
  ['219261111088','GIFT BOX','Canali Male Socks Gift Box',1,40000,40000],
  // GIFT ITEMS
  ['219281211101','GIFT ITEMS','Chocolate',7,3000,3000],
  ['219281111100','GIFT ITEMS','Peace Gift Set',1,45000,45000],
  ['219281011104','GIFT ITEMS','Love Commitment Bottle',9,5000,5000],
  ['219289111062','GIFT ITEMS','Love Heart Squishy',10,8000,8000],
  ['219288111055','GIFT ITEMS','Ring for Attention Bell',4,10000,10000],
  ['219287111027','GIFT ITEMS','Wobble Mug',2,50000,50000],
  ['219281111063','GIFT ITEMS','Flask & Bottle',8,65000,65000],
  ['219282111091','GIFT ITEMS','Heart Stoned Key Holder',7,45000,45000],
  ['219286111055','GIFT ITEMS','Ribbon Shaped Key Holder',4,45000,45000],
  ['219285111067','GIFT ITEMS','Cherry Key Holder',4,45000,45000],
  ['219284111056','GIFT ITEMS','Dog Key Holder',5,45000,45000],
  // HUMAN HAIR
  ['219312111014','HUMAN HAIR','Kentaz Human Hair 002',3,190000,190000],
  ['219311711106','HUMAN HAIR','Kentaz Human Hair 0017',1,790000,790000],
  ['219311211107','HUMAN HAIR','Kentaz Human Hair 0012',3,540000,540000],
  ['219316111024','HUMAN HAIR','Kentaz Human Hair 006',3,285000,285000],
  ['219311511100','HUMAN HAIR','Kentaz Human Hair 0015',2,680000,680000],
  ['219311311105','HUMAN HAIR','Kentaz Human Hair 0013',1,470000,470000],
  ['219318111034','HUMAN HAIR','Kentaz Human Hair 008',5,420000,420000],
  ['219311411106','HUMAN HAIR','Kentaz Human Hair 0014',2,630000,630000],
  ['219311011106','HUMAN HAIR','Kentaz Human Hair 0010',2,480000,480000],
  ['219319111018','HUMAN HAIR','Kentaz Human Hair 009',1,450000,450000],
  ['219317111087','HUMAN HAIR','Kentaz Human Hair 007',1,395000,395000],
  ['219315111024','HUMAN HAIR','Kentaz Human Hair 005',1,280000,280000],
  ['219314111018','HUMAN HAIR','Kentaz Human Hair 004',1,240000,240000],
  ['219313111058','HUMAN HAIR','Kentaz Human Hair 003',2,180000,180000],
  ['219311111033','HUMAN HAIR','Kentaz Human Hair 001',1,185000,185000],
  // JACKETS
  ['219391111071','JACKETS','Faux Leather Jacket',1,105000,105000],
  // JEWELRY
  ['219135611100','JEWELRY','Elite Zircona Rings',11,45000,45000],
  ['219135711100','JEWELRY','Radiant Zircona Rings',25,40000,40000],
  ['219134711101','JEWELRY','4-Set Zircona Silver Jewelry',7,195000,195000],
  ['219132811104','JEWELRY','Pearl Brooch',14,15000,15000],
  ['219135511103','JEWELRY','Zircona Elegant Gold Bangle',1,75000,75000],
  ['219135411109','JEWELRY','Zircona Elegant Silver Bangle',1,75000,75000],
  ['219135311105','JEWELRY','Zircona Majestic Silver Bangle',3,85000,85000],
  ['219135211102','JEWELRY','Zircona Majestic Gold Bangle',2,85000,85000],
  ['219135111103','JEWELRY','Zircona Prestige Silver Bangle',2,95000,95000],
  ['219135011101','JEWELRY','Zircona Prestige Gold Bangle',1,95000,95000],
  ['219134911104','JEWELRY','4-Set Zircona Colored Jewelry',3,210000,210000],
  ['219134811100','JEWELRY','4-Set Zircona Gold Jewelry',2,195000,195000],
  ['219131311102','JEWELRY','Male Rings',20,15000,15000],
  ['219134511104','JEWELRY','Blossom Gold Set',1,35000,35000],
  ['219134411107','JEWELRY','Celestia Gold Set',2,35000,35000],
  ['219134311109','JEWELRY','Eli Gold Set',1,35000,35000],
  ['219134111109','JEWELRY','Celestial Gold & Pearl Set',2,35000,35000],
  ['219134211103','JEWELRY','Regal Aura Set',1,35000,35000],
  ['219134011105','JEWELRY','Petals Gold Set',1,35000,35000],
  ['219133911105','JEWELRY','Aurum Luxe Set',1,35000,35000],
  ['219133811105','JEWELRY','Grace Gold Set',1,35000,35000],
  ['219133711101','JEWELRY','Grace Silver Set',1,35000,35000],
  ['219133611106','JEWELRY','LV Gold Set',1,35000,35000],
  ['219133511109','JEWELRY','Fendi Gold Set',1,35000,35000],
  ['219133411106','JEWELRY','Valentino Gold Set',1,35000,35000],
  ['219133311104','JEWELRY','Valentino Gold & Pearl Set',1,35000,35000],
  ['219133211107','JEWELRY','Divine Silver Set',1,45000,45000],
  ['219132911109','JEWELRY','Luxe Gold Set',1,45000,45000],
  ['219132711107','JEWELRY','Prestige Silver Set',1,45000,45000],
  ['219132611102','JEWELRY','Elite Silver Set',1,30000,30000],
  ['219131411109','JEWELRY','D Don Silver Set',2,45000,45000],
  ['219139111058','JEWELRY','D Don Gold Set',2,45000,45000],
  ['219132511104','JEWELRY','Radiant Silver Set',1,45000,45000],
  ['219132411107','JEWELRY','Noble Gold Set',1,30000,30000],
  ['219132311106','JEWELRY','Empress Silver Set',1,30000,30000],
  ['219131511108','JEWELRY','Imperial Silver Set',2,45000,45000],
  ['219132211108','JEWELRY','Bold Silver Neck Piece',1,20000,20000],
  ['219132111109','JEWELRY','DD Earring',1,18000,18000],
  ['219132011109','JEWELRY','Flowery Silver Neck Piece',1,18000,18000],
  ['219131911106','JEWELRY','Crown Colorful Set',2,30000,30000],
  ['219131811101','JEWELRY','Blue Flowery Silver Set',2,30000,30000],
  ['219131711102','JEWELRY','Majestic Silver Set',1,45000,45000],
  ['219131611101','JEWELRY','Regal Gold Set',1,35000,35000],
  ['219135111065','JEWELRY','Missy Gold Set',1,45000,45000],
  ['219137111006','JEWELRY','Ugo Gold Set',1,55000,55000],
  ['219133111062','JEWELRY','Floxy Gold Set',1,40000,40000],
  ['219131211106','JEWELRY','Gold Royal Set',2,55000,55000],
  ['219131111107','JEWELRY','Silver Royal Set',2,55000,55000],
  ['219131111023','JEWELRY','Queen Set Jewelry',1,85000,85000],
  ['219136111065','JEWELRY','Emy Gold Set',1,45000,45000],
  ['219134111085','JEWELRY','Floxy Pro Gold Set',1,45000,45000],
  ['219131011107','JEWELRY','Kezzy Gold Set',1,65000,65000],
  ['219138111044','JEWELRY','Floxy DD Gold Set',1,65000,65000],
  ['219132111085','JEWELRY','Princess Set Piece Jewelry',1,70000,70000],
  // LORO PIANA SLIDES / MALE LORO PIANA → Shoes
  ['219371111089','LORO PIANA SLIDES','Loro Piana Slide',4,820000,820000],
  ['219221311104','MALE LORO PIANA','Blue Suede White Sole Loro Piana Shoe Size 41',1,310000,310000],
  // OILS AND SERUM
  ['219921110610','OILS AND SERUM','Brightening Body Oil',1,25000,25000],
  ['219941110775','OILS AND SERUM','Face Repair Serum',8,15000,15000],
  ['219951110315','OILS AND SERUM','Knuckles Vanishing Serum',4,20000,20000],
  ['219911110141','OILS AND SERUM','3D Glow & Glimmer Oil',2,25000,25000],
  // PANTYHOSE
  ['219385111000','PANTYHOSE','Penti Timeless Weaves L/XL',6,45000,45000],
  ['219384111045','PANTYHOSE','Penti Stripe L/XL',6,45000,45000],
  ['219383111043','PANTYHOSE','Penti Drops L/XL',6,45000,45000],
  ['219382111042','PANTYHOSE','Penti Rose Infinity L/XL',6,45000,45000],
  ['219381111066','PANTYHOSE','Penti Mini Dot L/XL',5,45000,45000],
  ['219386111076','PANTYHOSE','Penti Knit L/XL',6,45000,45000],
  // SCRUBS
  ['219811110268','SCRUBS','Magical Lightening Exfoliating Scrub',2,23000,23000],
  ['219821110533','SCRUBS','Half Caste Face & Body Scrub',4,23000,23000],
  // SHOES
  ['219183111084','SHOES','Black Todds Female Shoes',5,290000,290000],
  ['219114011103','SHOES','Half Heels Gucci',2,250000,250000],
  ['219187111050','SHOES','Loro Piana Adult Shoes',11,750000,750000],
  ['219113111100','SHOES','Black Todds Male Shoe Size 10 11 12',3,310000,310000],
  ['219184111086','SHOES','Brown Todds Female Shoes',3,290000,290000],
  ['219113911108','SHOES','H&M Ankle Shoe',2,110000,110000],
  ['219186111055','SHOES','Loro Piana Adult Female Shoes',3,750000,750000],
  ['219113811106','SHOES','Off White Linzi Heels',1,75000,75000],
  ['219115111058','SHOES','Red Marc Fisher Cover Shoe',1,100000,100000],
  ['219113011105','SHOES','Army Green Zegna Shoe Size 45',1,800000,800000],
  ['219112711104','SHOES','Grey & White Sole Zegna Shoe Size 43 46',2,700000,700000],
  ['219112911109','SHOES','Knitted Brown Leather Zegna Shoe Size 45',1,750000,750000],
  ['219112411103','SHOES','Blue Zegna Shoe With Knit Size 45',1,750000,750000],
  ['219112611102','SHOES','Plain Black Leather Zegna Shoe Size 45 46',2,800000,800000],
  ['219112511104','SHOES','Plain Brown Leather Zegna Shoe Size 45 46',2,800000,800000],
  ['219113711100','SHOES','Cuater Comfort Shoe Travismathew Size 11.5',1,180000,180000],
  ['219113611106','SHOES','Black Flat Shoes With Wool Sole',1,70000,70000],
  ['219113511106','SHOES','Black Forever Comfort Flat Shoes',1,75000,75000],
  ['219113411108','SHOES','Blue Ferragamo Male Shoe Size 44',1,315000,315000],
  ['219113311108','SHOES','Brown Ferragamo Male Shoe Size 43',1,315000,315000],
  ['219113211108','SHOES','Black Ferragamo Male Shoe Size 12',1,315000,315000],
  ['219110211101','SHOES','Platinum Black Capone Cover Heels Size 39 40',1,87000,87000],
  ['219195111038','SHOES','Metallic Black Stoned Cover Heels Size 40 41',2,85000,85000],
  ['219111011102','SHOES','Satin Black Cover Heel',1,110000,110000],
  ['219112311104','SHOES','Purple Boot Heels Shoe',1,85000,85000],
  ['219112211100','SHOES','Alexander McQueen Adult Female White Sneakers',1,230000,230000],
  ['219112111101','SHOES','Brown Flat Capone Cover Shoes Size 39',1,68000,68000],
  ['219112011106','SHOES','Black Crinkle Patent Cover Shoes Size 39',1,68000,68000],
  ['219111911105','SHOES','Off White With Gold Buckle Cover Heels Size 39',1,68000,68000],
  ['219111811106','SHOES','Patent Black With Gold Buckle Cover Heels Size 38',2,68000,68000],
  ['219111711104','SHOES','Satin Black Stoned Capone Cover Heels Size 39 40',2,80000,80000],
  ['219111611105','SHOES','Black & Silver Stoned Capone Cover Heels Size 39 40',2,65000,65000],
  ['219111511106','SHOES','Black Stretch Capone Flat Cover Shoes Size 39 41',3,87000,87000],
  ['219111411100','SHOES','Brown Capone Flat Cover Shoes Size 40 41',2,87000,87000],
  ['219111311108','SHOES','Navy Capone Flat Cover Shoes Size 39 41',3,87000,87000],
  ['219111211103','SHOES','Mink Capone Flat Cover Shoes Size 40 41',2,87000,87000],
  ['219111111100','SHOES','Black Capone Flat Cover Shoes Size 40 41',2,87000,87000],
  ['219110911100','SHOES','Brown Cover Shoe Heel Size 39 40',2,90000,90000],
  ['219110811109','SHOES','Black Cover Shoe Heel Size 40',1,90000,90000],
  ['219110511107','SHOES','Patent Red Open Sided Cover Heels Size 40 41',2,87000,87000],
  ['219110711108','SHOES','Patent Red Capone Cover Heels Size 39 40',2,87000,87000],
  ['219110611109','SHOES','Patent Black Open Sided Cover Heels Size 39 41',2,87000,87000],
  ['219110411107','SHOES','Black Boot Cover Heels Size 39 40',2,95000,95000],
  ['219110311107','SHOES','Metallic Black Cover Heels Size 39',2,87000,87000],
  ['219110111102','SHOES','Leopard Capone Cover Heels Size 37',1,87000,87000],
  ['219110011105','SHOES','Blue & Flowery Sandal Heels Size 39 40',2,68000,68000],
  ['219199111065','SHOES','Black & Flowery Sandal Heels Size 38 40',3,68000,68000],
  ['219198111057','SHOES','Beige & Flowery Cover Heels Size 39 41',2,68000,68000],
  ['219197111086','SHOES','Black & Flowery Cover Heels Size 41',1,68000,68000],
  ['219196111006','SHOES','Satin Black Cover Heels Size 39 41',3,95000,95000],
  ['219193111062','SHOES','Leopard Capone Cover Heels Size 40 39',2,95000,95000],
  ['219192111081','SHOES','Leopard Capone Slipper Heels Size 41',1,60000,60000],
  ['219191111046','SHOES','Platinum Capone Flat Shoes Size 41 42',2,70000,70000],
  ['219190111008','SHOES','Gold Capone Flat Shoes Size 42 43',2,70000,70000],
  ['219189111028','SHOES','Black Capone Flat Shoes Size 42 43',2,68000,68000],
  ['219188111064','SHOES','Metallic Black Flat Capone Shoes',1,68000,68000],
  ['219175111074','SHOES','Gucci Black Flat Shoes',1,145000,145000],
  ['219156111022','SHOES','Guess Black Heels',1,145000,145000],
  ['219182111042','SHOES','LV Blue Shoes',2,145000,145000],
  ['219185111081','SHOES','Vaiyu & Fashion Pink Sandal Heel',1,90000,90000],
  ['219179111043','SHOES','Tory Burch Black Shoes',4,145000,145000],
  ['219181111078','SHOES','Valentino Green Shoes',2,145000,145000],
  ['219180111095','SHOES','Kenzo Red Shoes',2,145000,145000],
  ['219178111089','SHOES','SF Pink Shoes',2,145000,145000],
  ['219177111016','SHOES','SF Black Shoes',2,145000,145000],
  ['219176111073','SHOES','Miu Miu Silver Shoes',2,145000,145000],
  ['219174111069','SHOES','Manolo Red Shoes',2,145000,145000],
  ['219173111047','SHOES','Brown Calvin Klein Sneakers Size 10',1,120000,120000],
  ['219170111056','SHOES','Brown Slipper Heels',1,38500,38500],
  ['219169111094','SHOES','Gucci Black Heels',1,280000,280000],
  ['219159111025','SHOES','Hilfiger Sneakers',1,120000,120000],
  ['219158111098','SHOES','Sketchers Sneakers',1,120000,120000],
  ['219143111099','SHOES','White Polo Trainers',1,65000,65000],
  ['219164111067','SHOES','Me Too Sandals',1,65000,65000],
  ['219161111016','SHOES','Skechers Slip-Ins Sneakers',1,110000,110000],
  ['219114111015','SHOES','Cheque Atalina Slip-On',1,45000,45000],
  ['219125111077','SHOES','Brown Old Navy Slippers',1,33000,33000],
  ['219124111099','SHOES','Black Old Navy Slippers',1,33000,33000],
  ['219163111015','SHOES','White Guess Sneakers',1,240000,240000],
  ['219162111077','SHOES','GBG Slippers',1,45000,45000],
  ['219140111096','SHOES','Green Soda Boot',1,130000,130000],
  ['219119111082','SHOES','Pink Barbie Wedge Slippers',1,60000,60000],
  ['219123111032','SHOES','Pink Forever 21 Sandal',1,52000,52000],
  ['219252611109','SHOES','Black Levi Sneakers Size 9.5 12',3,85000,85000],
  ['219168111093','SHOES','Black Guess Male Shoe Size 8 10.5',3,140000,140000],
  ['219167111025','SHOES','Black Calvin Klein Corp Shoe Male Size 8.5',1,145000,145000],
  ['219166111099','SHOES','Brown Guess Male Shoe Size 7.5',1,95000,95000],
  ['219165111081','SHOES','Dockers Brown Corp Male Shoe Size 9.5',1,85000,85000],
  ['219181110110','SHOES','White Forever 21 Wedge Slippers',1,82000,82000],
  ['219120111098','SHOES','Brown Forever 21 High Sandal',1,80000,80000],
  ['219147111083','SHOES','Zara Heels',1,50000,50000],
  ['219118111040','SHOES','Black Barbie Wedge Slippers',1,60000,60000],
  ['219129111028','SHOES','Aldo Black Shoe',1,145000,145000],
  ['219130111011','SHOES','Nautica Black Shoe',1,155000,155000],
  ['219132111057','SHOES','Jelly Pop Black Shoe Brown Strap',1,135000,135000],
  ['219128111059','SHOES','Madden Girls Black Shoe',1,145000,145000],
  ['2415676571562','SHOES','Animal Print Sandals',1,90000,90000],
  ['219149111007','SHOES','Brown Sandals',1,68500,68500],
  ['219121111065','SHOES','Black So Me Rope Sandal',1,61500,61500],
  ['219117111028','SHOES','Brown Forever 21 Wedge Slippers',1,80000,80000],
  ['219144111021','SHOES','Jess Southern Multi Color Sandal',1,105000,105000],
  ['219161110375','SHOES','Pink Forever 21 Peep Toe Sandal',1,125000,125000],
  ['219148111040','SHOES','Versace Sandal Heels',1,55500,55500],
  ['219146111096','SHOES','Jean Colored Heels',1,55000,55000],
  ['219157111004','SHOES','Ted Baker Heels',1,165000,165000],
  ['219145111088','SHOES','Red Calvin Klein Shoes',1,185000,185000],
  ['219126111096','SHOES','Black Soja Block Heels Shoe',1,220000,220000],
  // SKIN CARE
  ['219301211101','SKIN CARE','Koec Face Spray 100ml',2,20000,20000],
  ['219302111009','SKIN CARE','Koec Retinol Firming Eye Cream',3,30000,30000],
  ['219304111077','SKIN CARE','Koec 3D Lifting Cream',4,48000,48000],
  ['219301111107','SKIN CARE','Koec Jelly Booster Body Potion 30ml',2,30000,30000],
  ['219301011107','SKIN CARE','Koec Vitamin C Facial Serum 30ml',3,25000,25000],
  ['219309111062','SKIN CARE','Koec Rice Arbutin Glow Deep Serum 10ml',4,25000,25000],
  ['219308111041','SKIN CARE','Koec Pink Spicule Serum 30ml',4,30000,30000],
  ['219307111053','SKIN CARE','Koec Turmeric Facial Serum 30ml',4,28000,28000],
  ['219306111032','SKIN CARE','Koec Vitamin B5 Hyaluronic Acid Facial Serum',4,28000,28000],
  ['219305111079','SKIN CARE','Koec Beauty Face Tightener 70ml',4,25000,25000],
  ['219303111000','SKIN CARE','Koec Vitamin C Gel Sleeping Mask',5,45000,45000],
  ['219301111032','SKIN CARE','Koec Cucumber Aloe Gel Sleeping Mask',5,45000,45000],
  // SOAPS
  ['219641110661','SOAPS','Spotless Brightening Soap',5,27000,27000],
  ['219611110725','SOAPS','Lightening Milk Bar Soap',14,8000,8000],
  // SPORT WEAR
  ['219322111090','SPORT WEAR','Sport Wear Jacket & Leggings Set',20,75000,75000],
  ['219323111047','SPORT WEAR','Sport Wear Jacket & Palazzo Set',3,80000,80000],
  ['219321111061','SPORT WEAR','Sport Wear Jumpsuit',7,65000,65000],
  // TIES
  ['219278111059','TIES','Feather Flower Tie',5,55000,55000],
  ['219277111085','TIES','Cufflinks',4,55000,55000],
  ['219274111067','TIES','Mr White Tie',1,40000,40000],
  ['219279111053','TIES','Bow Tie',7,35000,35000],
  ['219276111057','TIES','Wool Blue & Red Tie',1,48500,48500],
  ['219275111021','TIES','Checkered Tie',4,45000,45000],
  ['219273111035','TIES','Fashion Tie',10,40000,40000],
  ['219272111022','TIES','3-Piece Tie Pocket Handkerchief & Cufflinks',6,80000,80000],
  ['219271111068','TIES','3-Piece Tie Pocket Handkerchief & Brooch',6,75000,75000],
  // TOYS (adult)
  ['219346111078','TOYS','A Red Lip',2,95000,95000],
  ['219345111099','TOYS','The Flaming Lips',2,85000,85000],
  ['219344111053','TOYS','Massager 152mm',1,75000,75000],
  ['219343111092','TOYS','Massager 202mm',1,95000,95000],
  ['219342111013','TOYS','Thrusting Rotating Dildo Small',1,55000,55000],
  ['219341111092','TOYS','Thrusting Rotating Dildo 430g',2,120000,120000],
  // TURKEY WEARS
  ['219324911100','TURKEY WEARS','Caramel Brown Flair Side Zip Long Gown',3,85000,85000],
  ['219339111037','TURKEY WEARS','Pink Turtle Neck Sleeveless Gown',3,40000,40000],
  ['219314111041','TURKEY WEARS','Mischka Sin Pink Double Breasted',3,120000,120000],
  ['219313111001','TURKEY WEARS','Mischka Orange Double Breasted',3,120000,120000],
  ['219311111035','TURKEY WEARS','Mischka Green Fringe Suit Set',2,120000,120000],
  ['219318111007','TURKEY WEARS','Mischka Cheque Skirt & Suit Set',1,120000,120000],
  ['219310111050','TURKEY WEARS','Mischka Pink Suits',2,120000,120000],
  ['219378111014','TURKEY WEARS','2-Piece Corp Gown & Jacket',17,125000,125000],
  ['219362111035','TURKEY WEARS','Sky Blue Bodycon Gown',1,35000,35000],
  ['219355111015','TURKEY WEARS','White Jacket Rose Gown',2,40000,40000],
  ['219368111022','TURKEY WEARS','Black Button Short Gown',4,29000,29000],
  ['219324511100','TURKEY WEARS','Black Shiny Long Gown With Silver Stone On Wrist & Waist',3,230000,230000],
  ['219311011108','TURKEY WEARS','Espoll Gown',2,95000,95000],
  ['219318611106','TURKEY WEARS','Black Heavy Stoned 2-Piece Abaya L XL',2,145000,145000],
  ['219311311101','TURKEY WEARS','Haniqa Gown',2,60000,60000],
  ['219319611102','TURKEY WEARS','Black Cardilli Collection Corporate Short Gown Size 44-50',3,68500,68500],
  ['219325111107','TURKEY WEARS','Caramel Yellow & Purple Flowery Gown With Inner',3,95000,95000],
  ['219324711105','TURKEY WEARS','Caramel Coffee Brown Flowery Hand & Knee Gown',4,210000,210000],
  ['219323811102','TURKEY WEARS','Cardili Short Green Corp Gown With Rose & Belt Size 38-44',3,70000,70000],
  ['219324811105','TURKEY WEARS','Caramel Green Shiny Sides Open Long Gown',3,110000,110000],
  ['219311511102','TURKEY WEARS','Haniqa Shirt',5,48500,48500],
  ['219366111085','TURKEY WEARS','Black Long Sleeve Button Bodycon',1,35000,35000],
  ['219386111004','TURKEY WEARS','Shiny Leggings',12,30000,30000],
  ['219325211106','TURKEY WEARS','Black Lace Short Gown With White Collar',3,165000,165000],
  ['219325011109','TURKEY WEARS','Caramel Beige 2-Piece Skirt & Top',5,125000,125000],
  ['219324611106','TURKEY WEARS','Caramel Sequin Short Gown Size 40-48',5,125000,125000],
  ['219397111000','TURKEY WEARS','Satin Corp Shirt',3,48500,48500],
  ['219321411106','TURKEY WEARS','Caramel Black Stoned Neck Long Gown Size 38-46',4,165000,165000],
  ['219320511109','TURKEY WEARS','Brown Katalya Pattern Cut Abaya',1,155000,155000],
  ['219320411104','TURKEY WEARS','Katalya 3-Toned Abaya Free Size',4,95000,95000],
  ['219318511105','TURKEY WEARS','Green Heavy Stoned 2-Piece Abaya L XL 2XL',3,145000,145000],
  ['219321211107','TURKEY WEARS','Caramel Off White Royal Gown With Belt Size 38-46',4,220000,220000],
  ['219310011102','TURKEY WEARS','Boohoo Zebra Top',1,40000,40000],
  ['219311211106','TURKEY WEARS','Flair Jumpsuit',1,70000,70000],
  ['219321811101','TURKEY WEARS','Caramel White 3-Piece Flair Skirt Size 38-44',4,185000,185000],
  ['219317411102','TURKEY WEARS','White & Black Striped Skirt Suit 3-Piece Size 36-40',2,175000,175000],
  ['219321511108','TURKEY WEARS','Caramel Oxblood 3/4 Flowery Hand & Knee Gown Size 38-46',2,210000,210000],
  ['219311811106','TURKEY WEARS','2-Piece Skirt & Jacket',1,105000,105000],
  ['219209111082','TURKEY WEARS','Red Santa Anne Trouser Suit Button & Hook Size 46',1,150000,150000],
  ['219310211103','TURKEY WEARS','Carton Color Pant Set',4,55000,55000],
  ['219324411102','TURKEY WEARS','Pink Stretchy Slit Abaya',1,180000,180000],
  ['219311711102','TURKEY WEARS','Blue Regal Gown',1,110000,110000],
  ['219320111041','TURKEY WEARS','Noix Brown Cheque Suit Gown',1,55000,55000],
  ['219391111054','TURKEY WEARS','Ruched Slit Skirt',2,38500,38500],
  ['219329111080','TURKEY WEARS','Brown Airport Leather Skirt',1,42500,42500],
  ['219323111086','TURKEY WEARS','Miss Rock Multi Colored Gown',1,41500,41500],
  ['219315011105','TURKEY WEARS','Valentino Red Gown',2,95000,95000],
  ['219391110374','TURKEY WEARS','Vanita Corporate Sassy Gowns',3,41000,41000],
  ['219328111015','TURKEY WEARS','Pink Double Breasted Blazer Gown',2,60000,60000],
  ['219341111009','TURKEY WEARS','Red Sleeveless Bodycon With Fringes',4,35000,35000],
  ['219333111071','TURKEY WEARS','Multicolored Bubu & Scarf',1,32000,32000],
  ['219325111044','TURKEY WEARS','Blue Bubu Kaftan',1,30000,30000],
  ['219359111053','TURKEY WEARS','Blue Bubu With Green Hoodie',1,35000,35000],
  ['219372111089','TURKEY WEARS','Red Long Slit Gown',7,40500,40500],
  ['219337111016','TURKEY WEARS','La Bubu Gown',1,26000,26000],
  ['219314611101','TURKEY WEARS','Haniqa White Gown',3,60500,60500],
  ['219379111035','TURKEY WEARS','2-Piece Corp Skirt With Fringes',15,75000,75000],
  ['219382111069','TURKEY WEARS','Double Breasted Pant Set',10,95000,95000],
  ['219371120021','TURKEY WEARS','Red 2-Piece Pant Set',1,35000,35000],
  ['219399111049','TURKEY WEARS','Zoro Shirt Dress',1,32500,32500],
  ['219314411103','TURKEY WEARS','Pink Short Gown',1,75000,75000],
  ['219314511104','TURKEY WEARS','Joshi Gown',1,65000,65000],
  ['219365111034','TURKEY WEARS','Light Blue 2-Piece Pant Set',1,35000,35000],
  ['219310511100','TURKEY WEARS','Crop Two Piece Pant Set',2,42000,42000],
  ['219343111028','TURKEY WEARS','Brown 2-Piece Pant Set With Cut',2,35000,35000],
  ['219371110755','TURKEY WEARS','Red 2-Piece Pant Set V2',2,40000,40000],
  ['219310411108','TURKEY WEARS','Flowery Gown & Pant Set',2,50000,50000],
  ['219364111026','TURKEY WEARS','Red Rope 2-Piece Pant Set',1,35000,35000],
  ['219326111091','TURKEY WEARS','Multicolored 2-Piece Pant Set',1,32000,32000],
  ['219331110257','TURKEY WEARS','Black Two Piece With Side Cut',4,30500,30500],
  ['219310111100','TURKEY WEARS','2-Piece Stretchy Flowery Pant',6,52000,52000],
  ['219317111010','TURKEY WEARS','Tahirova Black Skirt & Suit Set',2,80000,80000],
  ['219315811100','TURKEY WEARS','Multicolored Slit Skirt',2,35000,35000],
  ['219381110233','TURKEY WEARS','Tahirova Green Skirt Suit Set',3,80000,80000],
  ['219322111062','TURKEY WEARS','Tahirova Milk Color Short Suit',1,75000,75000],
  ['219316111002','TURKEY WEARS','Tahirova Faded Blue Short Suit',1,75000,75000],
  ['219380111079','TURKEY WEARS','Plain Brown Pant & Belt',5,40500,40500],
  ['219381111015','TURKEY WEARS','Plain Black Pant & Belt',4,40500,40500],
  ['219324311102','TURKEY WEARS','Black High Waist Leggings',3,25000,25000],
  ['219385111083','TURKEY WEARS','Shiny Bikers Short',8,25000,25000],
  ['219353111097','TURKEY WEARS','Light Blue Vibrant Bum Short',1,20000,20000],
  ['219315611109','TURKEY WEARS','Black 2-Piece',1,225000,225000],
  ['219331111084','TURKEY WEARS','Camisole',16,18500,18500],
  ['219324211101','TURKEY WEARS','Santa Anne Brocade Green 2-Piece Skirt Suit Size 42',1,145000,145000],
  ['219324111108','TURKEY WEARS','Santa Anne Brocade Sky Blue 2-Piece Skirt Suit Size 44',1,145000,145000],
  ['219324011102','TURKEY WEARS','Cardili Short Black Corp Gown With Belt & Rose Size 38-44',4,70000,70000],
  ['219323911105','TURKEY WEARS','Alfetto Short Red Corp Gown With Belt & Stone Neck Size 38-44',4,70000,70000],
  ['219312011100','TURKEY WEARS','2-Piece Flair Skirt & Jacket',2,125000,125000],
  ['219311911100','TURKEY WEARS','2-Piece Skirt/Short & Jacket',1,85000,85000],
  ['219314711108','TURKEY WEARS','Skirt & Shirt 2-Piece',3,85000,85000],
  ['219322811102','TURKEY WEARS','Green & Yellow Loop Free Gown',1,85000,85000],
  ['219322711104','TURKEY WEARS','Black Loop Free Gown',1,55000,55000],
  ['219322611108','TURKEY WEARS','Pink Loop Free Gown',1,55000,55000],
  ['219322011106','TURKEY WEARS','Caramel Black 2-Piece Skirt & Jacket Size 40-46',4,185000,185000],
  ['219321911106','TURKEY WEARS','Caramel Short Flare Gown With Multicolored Stones Size 38-44',4,155000,155000],
  ['219321611100','TURKEY WEARS','Caramel Brown Chiffon Pearl & Stoned Long Gown Size 40-46',4,230000,230000],
  ['219321111103','TURKEY WEARS','Brown Lace Short Gown With White Collar Size 40-46',4,165000,165000],
  ['219320711102','TURKEY WEARS','Light Green Katalya Pattern Cut Abaya',1,155000,155000],
  ['219320611103','TURKEY WEARS','Dark Green Katalya Pattern Cut Abaya',1,155000,155000],
  ['219320011108','TURKEY WEARS','Lemon Jomins Collection Short Corp Gown Size 44',1,75000,75000],
  ['219319911104','TURKEY WEARS','Purple Jomins Collection Short Corp Gown Size 42-44',2,75000,75000],
  ['219319811104','TURKEY WEARS','Black Jomins Collection Short Corp Gown Size 44-48',3,75000,75000],
  ['219319711106','TURKEY WEARS','Orange Jomins Collection Short Corp Gown Size 48',1,75000,75000],
  ['219319511102','TURKEY WEARS','Green Cardilli Collection Corporate Short Gown Size 44-50',4,68500,68500],
  ['219319411106','TURKEY WEARS','Olive Green Butterfly 2-Piece Stoned Abaya XL',1,145000,145000],
  ['219319211105','TURKEY WEARS','White Butterfly 2-Piece Stoned Abaya 2XL',1,145000,145000],
  ['219319111108','TURKEY WEARS','Peach Butterfly 2-Piece Stoned Abaya 2XL',1,145000,145000],
  ['219318811105','TURKEY WEARS','Light Blue Meryem 2-Piece Stoned Abaya Size L',1,145000,145000],
  ['219318711106','TURKEY WEARS','White Meryem 2-Piece Stoned Abaya Size L',1,145000,145000],
  ['219318411109','TURKEY WEARS','Pink Stone Hand & Front Abaya Turkey Size M',1,125000,125000],
  ['219318211105','TURKEY WEARS','Blue Stone Hand & Front Abaya Turkey Size M',1,125000,125000],
  ['219318011107','TURKEY WEARS','Animal Skin 2-Piece Red Neck & Belt Size 36-42',4,95500,95500],
  ['219317911106','TURKEY WEARS','Light Sage Green Katalia Inside Belted Abaya Free Size',1,110000,110000],
  ['219317811102','TURKEY WEARS','Mauve Katalia Inside Belted Abaya Free Size',1,110000,110000],
  ['219317711106','TURKEY WEARS','Green Katalia Inside Belted Abaya Free Size',1,110000,110000],
  ['219317611102','TURKEY WEARS','White Katalia Inside Belted Abaya Free Size',1,110000,110000],
  ['219317511104','TURKEY WEARS','Red Katalia Inside Belted Abaya Free Size',1,110000,110000],
  ['219201111103','TURKEY WEARS','Black Santa Anne Trouser Suit 3-Button & Hook Size 42-48',2,150000,150000],
  ['219201011106','TURKEY WEARS','White Santa Anne Trouser Suit 3-Button & Hook Size 44-46',2,150000,150000],
  ['219205111012','TURKEY WEARS','Cream Santa Anne Skirt Suit Set 3-Button & Hook Size 46',1,150000,150000],
  ['219204111054','TURKEY WEARS','White Santa Anne Skirt Suit Set 3-Button & Hook Size 50',1,155000,155000],
  ['219393111056','TURKEY WEARS','Silk Crop Shirt',3,35000,35000],
  ['219313811101','TURKEY WEARS','Long Gold Shiny Gown',1,155000,155000],
  ['219327111011','TURKEY WEARS','Multicolored Sequin Jumpsuit',1,40000,40000],
  ['219394111050','TURKEY WEARS','Brown & Black Jumpsuit',2,48500,48500],
  ['219338111076','TURKEY WEARS','Yellow Playsuit',4,28000,28000],
  ['219317311100','TURKEY WEARS','Orange Flowery Tube Bodycon Dress',1,35000,35000],
  ['219363111087','TURKEY WEARS','Light Pink & Orange Gown',1,35000,35000],
  ['219344111057','TURKEY WEARS','White & Pink Flowery Bodycon Gown',2,35000,35000],
  ['219375111013','TURKEY WEARS','Red Long Sleeve Bodycon Gown',2,35000,35000],
  ['219321110280','TURKEY WEARS','Purple Long Sleeve Bodycon Gown',1,35000,35000],
  ['219311111100','TURKEY WEARS','My Styl Gown',5,65000,65000],
  ['219356111056','TURKEY WEARS','Lemon Free Gown',2,35000,35000],
  ['219371111005','TURKEY WEARS','Burnt Orange Free Gown',2,35000,35000],
  ['219316011103','TURKEY WEARS','Red Gown With Belt',2,79500,79500],
  ['219383111088','TURKEY WEARS','2-Piece Abaya & Jumpsuit Hoodie',4,115000,115000],
  ['219312511100','TURKEY WEARS','4 You Gown',1,105000,105000],
  ['219314211101','TURKEY WEARS','White Deng Gown',1,55000,55000],
  ['219316911104','TURKEY WEARS','Graphic Long Gown Side Pocket XL',2,42500,42500],
  ['219361111050','TURKEY WEARS','Black Party Mono Strap Gown',2,40500,40500],
  ['219310311109','TURKEY WEARS','Pink Jumpsuit With Cape',1,48500,48500],
  ['219346111011','TURKEY WEARS','White Halter Neck Jumpsuit',4,35000,35000],
  ['219345111094','TURKEY WEARS','Purple Jumpsuit Open Back',1,35500,35500],
  ['219376111084','TURKEY WEARS','Red Jumpsuit Open Back',5,35500,35500],
  ['219395111084','TURKEY WEARS','Brown Jumpsuit',2,48500,48500],
  ['219317211100','TURKEY WEARS','Red Melorin Gown',3,95000,95000],
  ['219317111102','TURKEY WEARS','Black Melorin Gown',4,95000,95000],
  ['219311611101','TURKEY WEARS','Melorin Gown',4,95000,95000],
  ['219313911107','TURKEY WEARS','Black Print Gown',1,125000,125000],
  ['219351110636','TURKEY WEARS','Black Short Flare Gown',2,35000,35000],
  ['219310611104','TURKEY WEARS','Multicolored Polka Dot Gown',1,36500,36500],
  ['219312111103','TURKEY WEARS','W.YSS Gown',1,95000,95000],
  ['219317011101','TURKEY WEARS','Black 3-Piece Net Party Gown',1,55000,55000],
  ['219389111050','TURKEY WEARS','Red 3-Piece Net Party Gown',1,55000,55000],
  ['219314311108','TURKEY WEARS','Flowery 2-Piece',1,120000,120000],
  ['219310911101','TURKEY WEARS','Livello Gown',6,95000,95000],
  ['219342111073','TURKEY WEARS','Brown Button Short Bodycon Gown',3,29000,29000],
  ['219314011105','TURKEY WEARS','Green Gown',1,95500,95500],
  ['219314111104','TURKEY WEARS','Purple Gown',1,95500,95500],
  ['219315111102','TURKEY WEARS','White Flair Gown',1,78500,78500],
  ['219312211107','TURKEY WEARS','Ji Jbong Gown',1,110000,110000],
  ['219312311107','TURKEY WEARS','Gold Gown',1,90000,90000],
  ['219314811107','TURKEY WEARS','Green Arizona Gown',4,70000,70000],
  ['219312711108','TURKEY WEARS','My Face Definitely Will T-Shirt',1,25000,25000],
  ['219313411109','TURKEY WEARS','God Dey Create Shaaa T-Shirt',1,25000,25000],
  ['219312911104','TURKEY WEARS','Spoil Your Man Today T-Shirt',1,25000,25000],
  ['219312611106','TURKEY WEARS','Who Is Your Guy T-Shirt',1,25000,25000],
  ['219313211106','TURKEY WEARS','Girls Just Wanna Have Funds T-Shirt',4,25000,25000],
  ['219312811102','TURKEY WEARS',"Here's To Strong Women T-Shirt",2,25000,25000],
  ['219313711109','TURKEY WEARS',"I'm Not Lucky T-Shirt",2,25000,25000],
  ['219315711101','TURKEY WEARS','Black Short Sleeve Corp Shirt',2,48500,48500],
  ['219313511106','TURKEY WEARS','I Dont Need Your Attitude T-Shirt',2,25000,25000],
  ['219313011101','TURKEY WEARS','Treat Your Girl Right T-Shirt',1,25000,25000],
  ['219360111006','TURKEY WEARS','Black Milon Two Piece Suit Set',1,75000,75000],
  ['219313311109','TURKEY WEARS','Dont Envy Me T-Shirt',1,25000,25000],
  ['219313611105','TURKEY WEARS','They Convinced You T-Shirt',1,25000,25000],
  ['219313111100','TURKEY WEARS','If You Dont Pay My Bill T-Shirt',3,25000,25000],
  ['219314911100','TURKEY WEARS','Red Arizona Gown',4,70000,70000],
  // U.S WEARS
  ['219438511107','U.S WEARS','Blue Striped Amiri 2-Piece',2,110000,110000],
  ['219441811105','U.S WEARS','Black Collar Polo T-Shirt',1,38000,38000],
  ['219426611106','U.S WEARS','Designed Black Panty Hose',23,25000,25000],
  ['219441211100','U.S WEARS','Plain Black Panty Hose',5,25000,25000],
  ['219436811106','U.S WEARS','Short Colored Flair Gown',1,35000,35000],
  ['219444511109','U.S WEARS','Sky Blue & White Beach Short XL',1,55000,55000],
  ['219444411105','U.S WEARS','Burnt Orange Cato Top XL',1,48500,48500],
  ['219444311107','U.S WEARS','Fig & Flowery Animal Skin Top Size S',1,50000,50000],
  ['219444211100','U.S WEARS','Red & Blue Striped Gibson Top Size S',1,48500,48500],
  ['219444111108','U.S WEARS','Turquoise Blue Tahari Top XL',1,60000,60000],
  ['219444011106','U.S WEARS','Red & Black Cato Flowery Top 2XL',1,55000,55000],
  ['219443911105','U.S WEARS','White Loft Flowery Top Size S',1,48500,48500],
  ['219443811108','U.S WEARS','Black Short Sleeve Top XL',1,55000,55000],
  ['219443711104','U.S WEARS','Pink White Black JM Collection Top XL',1,55000,55000],
  ['219443611101','U.S WEARS','Peach Front Button Top With Collar Size M',1,48500,48500],
  ['219443511103','U.S WEARS','Brown Hazel Moon Top XL',1,48500,48500],
  ['219443411106','U.S WEARS','Black RQT Woman Top 2XL',1,48500,48500],
  ['219438411103','U.S WEARS','Cream & Brown Louis Vuitton 2-Piece',3,75000,75000],
  ['219434711109','U.S WEARS','Lusa Free Gown',2,55000,55000],
  ['219459111026','U.S WEARS','Pink Flowery Mono Strap Bodycon',1,35000,35000],
  ['219410911103','U.S WEARS','Bikers Short',4,15000,15000],
  ['219426411105','U.S WEARS','Men Wall Street Singlet',1,22000,22000],
  ['219433111103','U.S WEARS','Siwar Black Gown',2,85500,85500],
  ['219432311107','U.S WEARS','Calvin Klein Gown',1,140000,140000],
  ['219456111035','U.S WEARS','Black & White All Purpose Gown',1,35000,35000],
  ['219431111100','U.S WEARS','Green Skirt',1,45000,45000],
  ['219426311100','U.S WEARS','Brown Panty Hose',9,25000,25000],
  ['219440011101','U.S WEARS','Anne Klein Animal Skin Top XL',1,65000,65000],
  ['219431011103','U.S WEARS','Male Shorts',3,68500,68500],
  ['219431611107','U.S WEARS','Joggers',2,95000,95000],
  ['219427511107','U.S WEARS','Blue Annier Top',1,35000,35000],
  ['219430611102','U.S WEARS','Mesh Tops',5,35000,35000],
  ['219440311108','U.S WEARS','Blue Suede Calvin Klein Short Dress',1,95000,95000],
  ['219463111059','U.S WEARS','Red Bodycon Corporate Gown',5,35000,35000],
  ['219438611104','U.S WEARS','Men Zara Singlet',9,30000,30000],
  ['219411711105','U.S WEARS','Sexy Solid Zipper Black Bodycon',2,37000,37000],
  ['219476111034','U.S WEARS','Horse Tail Male Wrist Watch',6,35000,35000],
  ['219429011105','U.S WEARS','Black & White Flair Skirt',1,35000,35000],
  ['219437511100','U.S WEARS','Black Beaded Flair Gown',1,85000,85000],
  ['219418111080','U.S WEARS','Ox Blood Say Wadi Bodycon Gown',1,35000,35000],
  ['219412311106','U.S WEARS','Green Double Breasted Blazer Dress',1,45000,45000],
  ['219499111036','U.S WEARS','Red St John Wool Skirt',1,30000,30000],
  ['219436111085','U.S WEARS','Flowery Loft Skirt',1,35000,35000],
  ['219431311105','U.S WEARS','Black Velocity Skirt',1,45000,45000],
  ['219422811105','U.S WEARS','Black Bar III Skirt',1,35000,35000],
  ['219411411106','U.S WEARS','Sexy Marbled Print Split Thigh Dress',1,35000,35000],
  ['219434511100','U.S WEARS','White & Green Long Dress',2,50000,50000],
  ['219420511109','U.S WEARS','Hot Pink Colorblock Mesh Mermaid Dress',1,18000,18000],
  ['219431511107','U.S WEARS','Black Soho Skirt',1,35000,35000],
  ['219429911109','U.S WEARS','Animal Print Skirt',3,35000,35000],
  ['219434411107','U.S WEARS','G&G Blue Dress',2,55000,55000],
  ['219422511102','U.S WEARS','Mustard Green Flowery Print Dress',1,35000,35000],
  ['219437411108','U.S WEARS','Green Free Gown',1,45000,45000],
  ['219417011102','U.S WEARS','Black Print Bishop Sleeve Top',1,40000,40000],
  ['219431411109','U.S WEARS','Black Leather Skirt',1,45000,45000],
  ['219458111093','U.S WEARS','Black Sleeveless Bodycon Crazy Dress',3,35000,35000],
  ['219433611102','U.S WEARS','Black Side Beaded Gown',3,95000,95000],
  ['219426011100','U.S WEARS','Bubu With Flowery Neck',2,38000,38000],
  ['219427011102','U.S WEARS','Blue Jean Top',1,25000,25000],
  ['219427311103','U.S WEARS','White Hem Shirt Gown',1,35000,35000],
  ['219426211107','U.S WEARS','White & Brown MH Gown & Jacket',1,38000,38000],
  ['219488111005','U.S WEARS','Black Double Breasted Blazer Dress',1,41000,41000],
  ['219422411107','U.S WEARS','Black Grommet Eyelet Chain Dress',1,35000,35000],
  ['219437811103','U.S WEARS','Blue Big Shirt Gown',1,60500,60500],
  ['219417111001','U.S WEARS','Weareva Black & Brown Gown',2,41000,41000],
  ['219433511104','U.S WEARS','Red Side Beaded Gown',2,95000,95000],
  ['219423511107','U.S WEARS','Pink Striped Kit Sky Corporate Dress',3,62000,62000],
  ['219410111108','U.S WEARS','White Zara Shirt',1,35000,35000],
  ['219411511108','U.S WEARS','Sexy Lapel Neck Single Button Crop Top',1,35000,35000],
  ['219413511104','U.S WEARS','Green Fashion Nova Motor & Steel Dress',1,40000,40000],
  ['219423211109','U.S WEARS','Black Calvin Klein Wool Gown',1,150000,150000],
  ['219491111029','U.S WEARS','Black 2-Piece Leg Cut',1,32000,32000],
  ['219421511109','U.S WEARS','Brown All Over Print Shirred Waist Dress',1,35000,35000],
  ['219433111024','U.S WEARS','Black Saints Skirt & Top Set',1,40000,40000],
  ['219416011101','U.S WEARS','Pink Sequin Pleated Halter Neck Dress',1,41500,41500],
  ['219416611103','U.S WEARS','Black Double Breasted Cape Blazer',1,55000,55000],
  ['219420311106','U.S WEARS','Black Print Puff Sleeve Mermaid Dress',1,35000,35000],
  ['219429611105','U.S WEARS','St John Purple Gown',1,75000,75000],
  ['219416711107','U.S WEARS','Red Double Breasted Cape Blazer',1,55000,55000],
  ['219416211105','U.S WEARS','Orange 3-Piece Blazer & Shorts',3,46000,46000],
  ['219462111067','U.S WEARS','Purple Halter Neck Pant Set',2,32500,32500],
  ['219428011102','U.S WEARS','Black & White Polkadot Flair Gown',1,48500,48500],
  ['219425511101','U.S WEARS','Black Suede Party Gown & Fur',1,38000,38000],
  ['219428511100','U.S WEARS','Orange & Black Shirt Dress',1,42500,42500],
  ['219410511101','U.S WEARS','Pink Aylin Sport & Lounge Set',1,48000,48000],
  ['219421211105','U.S WEARS','Hot Pink Bustier Crop Top & Bodycon',1,35000,35000],
  ['219487111084','U.S WEARS','Brown Contrast Blazer & Pant Set',1,51000,51000],
  ['219429811101','U.S WEARS','2-Piece Skirt & Top',1,65000,65000],
  ['219413111052','U.S WEARS','Silver Love Yourself Gown',1,41000,41000],
  ['219434911100','U.S WEARS','Animal Skin Bodysuit',1,35000,35000],
  ['219436111107','U.S WEARS','3 Deng 2-Piece Set',2,65000,65000],
  ['219436611102','U.S WEARS','Black Brown Short Gown',1,55000,55000],
  ['219435911100','U.S WEARS','Brown Short Gown',1,55000,55000],
  ['219435211104','U.S WEARS','Tiger Print 2-Piece',1,60000,60000],
  ['219461111083','U.S WEARS','Black Two Piece Short Sleeve Set',1,30000,30000],
  ['219436211108','U.S WEARS','3 Deng Stoned 2-Piece Set',2,55000,55000],
  ['219430511108','U.S WEARS','New Station 2-Piece',1,125000,125000],
  ['219430211104','U.S WEARS','Black Grey Skirt & Jacket',1,85000,85000],
  ['219423411109','U.S WEARS','Black 4-Striped Kingston Grey Set',1,80000,80000],
  ['219425611107','U.S WEARS',"Men's White Tommy Hilfiger Tank Top",2,20000,20000],
  ['219426111105','U.S WEARS','Men Spencer Singlet',2,25000,25000],
  ['219426511100','U.S WEARS','Men Tantex Singlet',2,22000,22000],
  ['219438911104','U.S WEARS','Men Zara Boxers',50,25000,25000],
  ['219410311101','U.S WEARS','Silver Starlet Purse',1,36500,36500],
  ['219425211106','U.S WEARS','Red & Black Cheque Trouser',1,38500,38500],
  ['219413211108','U.S WEARS','Brown Cheque Sanctuary Pant',1,37000,37000],
  ['219432011100','U.S WEARS','Soho Pants',1,49500,49500],
  ['219431911105','U.S WEARS','Adrianna Papell Pants',1,48000,48000],
  ['219417911107','U.S WEARS','Black Cutout Waist Flap Pocket Pants',1,35000,35000],
  ['219428911106','U.S WEARS','Palazzo Pant',3,39500,39500],
  ['219434111066','U.S WEARS','Black Counterparis Pant',1,35000,35000],
  ['219432711108','U.S WEARS','H&M Pants',1,45000,45000],
  ['219413111103','U.S WEARS','Purple Happily Grey Pants',3,35000,35000],
  ['219432611108','U.S WEARS','Brown Pants',1,45000,45000],
  ['219413911103','U.S WEARS','Lemon Rachel Zoe Pant',1,36500,36500],
  ['219414111024','U.S WEARS','Green Nanette Pant',1,35000,35000],
  ['219420811101','U.S WEARS','Blue Ripped Contrast Mesh Flare Pants',1,33000,33000],
  ['219413011107','U.S WEARS','Red Zara Pant',1,33500,33500],
  ['219424111093','U.S WEARS','Pink Flowery Rachel Zoe Pant',1,37000,37000],
  ['219443111105','U.S WEARS','Carton Colored Fuukeel Packet Shirt Size 4',1,40000,40000],
  ['219443011102','U.S WEARS','Cream Colored Fuukeel Packet Shirt Size 4',1,40000,40000],
  ['219442911107','U.S WEARS','Ash Striped Fuukeel Packet Shirt Size 4',1,40000,40000],
  ['219442811106','U.S WEARS','White Fuukeel Packet Shirt Size 4',1,40000,40000],
  ['219442711106','U.S WEARS','Grey Fuukeel Packet Shirt Size 4',1,40000,40000],
  ['219442611103','U.S WEARS','Pink Stripes Fuukeel Packet Shirt Size 2',1,40000,40000],
  ['219442511100','U.S WEARS','Green Abaya & Scarf Size 6-12',3,45000,45000],
  ['219442411100','U.S WEARS','Black Abaya & Scarf',1,45000,45000],
  ['219442311102','U.S WEARS','Red Lacoste Collar T-Shirt Size 12',1,38000,38000],
  ['219442211108','U.S WEARS','Ash Chuandian Collar T-Shirt',1,36000,36000],
  ['219442011101','U.S WEARS','Red Tommy Hilfiger Collar T-Shirt Size 10',1,38000,38000],
  ['219441911103','U.S WEARS','Carton Color Polo Collar T-Shirt Size 18',1,38000,38000],
  ['219441711109','U.S WEARS','Black & Gold Collar Double City T-Shirt',2,36000,36000],
  ['219441611109','U.S WEARS','Colored Front Design Casual Top',6,30000,30000],
  ['219441511107','U.S WEARS','Stoned Casual White Top',1,35000,35000],
  ['219441411104','U.S WEARS','Stoned Casual Black Top',2,35000,35000],
  ['219441311106','U.S WEARS','Jean Denim Short',3,28000,28000],
  ['219410811102','U.S WEARS','Red Tie & Dye Leggings',3,25000,25000],
  ['219471111010','U.S WEARS','1826 Light Bum Short',1,20000,20000],
  ['219470111012','U.S WEARS','Dark Blue Denim Bum Short',1,20000,20000],
  ['219414711108','U.S WEARS','Blue Levi Jean Short',1,22500,22500],
  ['219469111085','U.S WEARS','Light Blue Bum Short Small Design',2,19000,19000],
  ['219414811100','U.S WEARS','Light Blue Ripped Jean Shorts',2,18500,18500],
  ['219468111012','U.S WEARS','Blue Special A Bum Short',1,16000,16000],
  ['219418211109','U.S WEARS','Black Crossover Backless Crop Top',1,19500,19500],
  ['219417611106','U.S WEARS','Lemon Green Ombre Backless Halter Top',1,33000,33000],
  ['219420611104','U.S WEARS','Dark Green Cut Out Hook & Eye Top',2,18500,18500],
  ['219440811106','U.S WEARS','Emma & Posh Black & White Wool Shirt Dress S M',2,75000,75000],
  ['219440611100','U.S WEARS','Sharagon Blue Corp Gown Size 16',1,65000,65000],
  ['219440411102','U.S WEARS','Red Calvin Klein Short Dress Size 14',1,95000,95000],
  ['219440111102','U.S WEARS','Liv Milano Green Top XL',1,55000,55000],
  ['219439811102','U.S WEARS','Ash DKNY Striped Pant XL',1,80000,80000],
  ['219431711103','U.S WEARS','Love Trends Jeans',1,58000,58000],
  ['219431811108','U.S WEARS','Black Marc Asher Shirt',1,165000,165000],
  ['219432111077','U.S WEARS','Black & White Zebra Shirt',1,42500,42500],
  ['219412711103','U.S WEARS','Blue Flowery Tahari Shirt',1,48500,48500],
  ['219416311103','U.S WEARS','Floral Black & Brown Long Sleeve Top',3,35000,35000],
  ['219435711102','U.S WEARS','Vanilla Star Jean',1,40500,40500],
  ['219435411106','U.S WEARS','White & Blue Figure Graphic Colored Top',1,35000,35000],
  ['219439711102','U.S WEARS','Red Corp Shirt',2,42500,42500],
  ['219435311106','U.S WEARS','Corp Shirt',4,42500,42500],
  ['219440111055','U.S WEARS','Blue Poodle Top',1,35000,35000],
  ['219417511104','U.S WEARS','Brown & Green Figure Graphic Colored Top',2,35000,35000],
  ['219429111109','U.S WEARS','Blue Mesh Top',1,30000,30000],
  ['219435511100','U.S WEARS','Silk Shirt',1,42500,42500],
  ['219412111035','U.S WEARS','Blue Thirty Thirty Sequin Top',2,35000,35000],
  ['219422211106','U.S WEARS','White & Flowery Floral Print Tie Top',4,48500,48500],
  ['219418111108','U.S WEARS','Multicolored Floral Crop Shirt',4,42500,42500],
  ['219439611102','U.S WEARS','Blue Cargo Slit Skirt',2,38500,38500],
  ['219427211107','U.S WEARS','Blue Hewer Jean Skirt',2,28500,28500],
  ['219429711102','U.S WEARS','Popular Singer Jean',1,45000,45000],
  ['219430111090','U.S WEARS','Blue Fashion Nova Stretchy Jean',1,35000,35000],
  ['219415711101','U.S WEARS','Biolove Inspired Denim Jean',1,35000,35000],
  ['219439511103','U.S WEARS','Black Cargo Jean 2-Pocket',2,46000,46000],
  ['219414911106','U.S WEARS','Blue Vibrant Jean With Patterns',3,37500,37500],
  ['219464111065','U.S WEARS','Msara Faded Black Jean',2,27000,27000],
  ['219465111019','U.S WEARS','Ash Color Vibrant Jean',2,32000,32000],
  ['219415111109','U.S WEARS','Brown JCEX Jean',2,38000,38000],
  ['219466111090','U.S WEARS','Blue Mild Ripped Jean With Gold Detail',2,28000,28000],
  ['219414411109','U.S WEARS','Blue M-Sara Jean',1,31000,31000],
  ['219467111086','U.S WEARS','Blue Mild Ripped Jean',2,28500,28500],
  ['219414511105','U.S WEARS','Blue Design-in-New Jean',1,33500,33500],
  ['219475111036','U.S WEARS','Pencil Mouth Rugged Jean',2,30000,30000],
  ['219414311107','U.S WEARS','Blue American Apparel Jean',2,31500,31500],
  ['219472111094','U.S WEARS','Surprise Denim Jean',2,30000,30000],
  ['219414111102','U.S WEARS','Salendo Blue Jean',1,32500,32500],
  ['219414211102','U.S WEARS','Salvaje Light Blue Jean',2,31500,31500],
  ['219415811107','U.S WEARS','Blue Shinrai Jean',1,33000,33000],
  ['219410711107','U.S WEARS','Kai Yue Blue Jeans',1,31000,31000],
  ['219414611102','U.S WEARS','Dakota Blue Jean',1,32500,32500],
  ['219420111104','U.S WEARS','Black Sleeve Shawl Collar Dress',1,42000,42000],
  ['219424711108','U.S WEARS','Green Jumpsuit',1,35000,35000],
  ['219420011107','U.S WEARS','Yellow Mock Neck Lantern Sleeve Top',1,41000,41000],
  ['219419411106','U.S WEARS','Red & Black Print Ruffle Long Dress',2,55000,55000],
  ['219490111013','U.S WEARS','Animal Skin Hem Dress',1,25000,25000],
  ['219432811109','U.S WEARS','CK Black Gown',1,145000,145000],
  ['219432911109','U.S WEARS','DKNY Purple Gown',1,145000,145000],
  ['219455111015','U.S WEARS','Purple Short Sleeve Bodycon Gown',5,32500,32500],
  ['219432211105','U.S WEARS','Maison Tara Gown',2,68500,68500],
  ['219418811101','U.S WEARS','Pink Flowery Tube Bodycon Dress',2,35000,35000],
  ['219417711102','U.S WEARS','Green Sleeveless Bodycon Dress',1,35000,35000],
  ['219433911104','U.S WEARS','Black Shiny Gown',4,85000,85000],
  ['219421911100','U.S WEARS','Biz Wear Striped Print Belted Shirt',1,60000,60000],
  ['219411111000','U.S WEARS','Animal Skin Fitted Gown',1,25000,25000],
  ['219412911100','U.S WEARS','Black Nine West Gown',1,35000,35000],
  ['219428811103','U.S WEARS','Black & Brown Long Gown',1,48500,48500],
  ['219434111109','U.S WEARS','Black Classic Gown',1,98500,98500],
  ['219434011102','U.S WEARS','Red Classic Gown',3,98500,98500],
  ['219439111101','U.S WEARS','Brown Fashion Nova Jumpsuit',1,35500,35500],
  ['219485111013','U.S WEARS','Black & White Contrast Mesh Lantern Dress',1,55000,55000],
  ['219457111006','U.S WEARS','Black Showback Jumpsuit With Stones',1,35000,35000],
  ['219436011103','U.S WEARS','Blue Gown With Belt',1,125000,125000],
  ['219436511106','U.S WEARS','Green 3 Deng Gown',1,38500,38500],
  ['219433411105','U.S WEARS','Lala Red Gown',2,90000,90000],
  ['219427411103','U.S WEARS','Black Spag Jumpsuit Bodycon',1,35500,35500],
  ['219435111108','U.S WEARS','FN Animal Print Gown',1,42500,42500],
  ['219438011102','U.S WEARS','Green Shirt Gown',1,48500,48500],
  ['219437211102','U.S WEARS','Pink Flair Open Back Gown',1,58500,58500],
  ['219420911103','U.S WEARS','Green Flowery Tropical Print Neck Dress',1,32000,32000],
  ['219436411104','U.S WEARS','Black Pleated Gown',1,59500,59500],
  ['219437611102','U.S WEARS','White Flair Flowery Gown',1,48500,48500],
  ['219437911101','U.S WEARS','Boohoo Flowery Gown',1,55000,55000],
  ['219436311105','U.S WEARS','Black Open Stoned Gown',1,75000,75000],
  ['219438111105','U.S WEARS','Gold Tiny Stoned Gown',1,78500,78500],
  ['219429511107','U.S WEARS','2-Piece Gown & Cape',1,80500,80500],
  ['219433211109','U.S WEARS','Niuniu Red Gown',2,65500,65500],
  ['219430011105','U.S WEARS','Peach Colored Gown',3,125000,125000],
  ['219419311104','U.S WEARS','White Bodycon Dress With Cloak',1,75000,75000],
  ['219439311100','U.S WEARS','Pink Bodycon With Cloak',2,75000,75000],
  ['219437111102','U.S WEARS','Black Net Gown',1,55000,55000],
  ['219436711105','U.S WEARS','Open Tommy Gown',3,49500,49500],
  ['219439111029','U.S WEARS','Black Fashion Nova Gown',1,45000,45000],
  ['219497111000','U.S WEARS','Black Bill Blass Button Gown',1,35000,35000],
  ['219437011109','U.S WEARS','Purple & Brown Gown',1,50000,50000],
  ['219436911108','U.S WEARS','White Long Bodycon Gown',1,55000,55000],
  ['219438211106','U.S WEARS','Collection London Gown',1,60000,60000],
  ['219433711104','U.S WEARS','NJJ Red Gown',2,89500,89500],
  ['219433811102','U.S WEARS','NJJ Black Gown',1,89500,89500],
  ['219433011107','U.S WEARS','Youmi Silver Gown',2,90000,90000],
  ['219434211105','U.S WEARS','Gold Shiny Gown',1,85000,85000],
  ['219434311107','U.S WEARS','Silver Shiny Gown',2,85000,85000],
  ['219427111106','U.S WEARS','Blue Babesome Giovanni Shirt',1,25000,25000],
  ['219430111109','U.S WEARS','You See This God T-Shirt',3,25000,25000],
  ['219427911105','U.S WEARS','Black & White Sassy Jack Gown',1,65000,65000],
  ['219424311105','U.S WEARS','Unless They Kill God T-Shirt',2,25000,25000],
  ['219424111101','U.S WEARS','They Convinced You T-Shirt US',1,25000,25000],
  ['219430311104','U.S WEARS','Bring Up My Past T-Shirt',1,25000,25000],
  ['219485111013','U.S WEARS','Bodycon Long Gown',4,48500,48500],
];

// ── HELPERS ──────────────────────────────────────────────────────────────

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const BAG_SHOE_SKUS = new Set([
  '219221111100','219221611108','219221411109','219221111108','219221011108','219229111093'
]);

function getCategory(csvCat, sku) {
  if (BAG_SHOE_SKUS.has(sku)) return 'Shoes';
  const map = {
    'ABAYAS': 'Abayas',
    'ACCESORIES': 'Accessories',
    'BAGS': 'Bags',
    'BEAUTY': 'Beauty & Skincare',
    'BODY CREAM': 'Beauty & Skincare',
    'CAPS': 'Accessories',
    'CHILDREN': 'Children',
    'CHINA WEARS': 'China Wears',
    'CLEANSERS': 'Beauty & Skincare',
    'FACE CREAM': 'Beauty & Skincare',
    'GIFT BOX': 'Gift Items',
    'GIFT ITEMS': 'Gift Items',
    'HUMAN HAIR': 'Human Hair',
    'JACKETS': 'Female Fashion',
    'JEWELRY': 'Jewelry',
    'LORO PIANA SLIDES': 'Shoes',
    'MALE LORO PIANA': 'Shoes',
    'OILS AND SERUM': 'Beauty & Skincare',
    'PANTYHOSE': 'Accessories',
    'SCRUBS': 'Beauty & Skincare',
    'SHOES': 'Shoes',
    'SKIN CARE': 'Beauty & Skincare',
    'SOAPS': 'Beauty & Skincare',
    'SPORT WEAR': 'Sport Wear',
    'TIES': 'Mens Wear',
    'TOYS': 'Adult Toys',
    'TURKEY WEARS': 'Turkey Wears',
    'U.S WEARS': 'U.S Wears',
  };
  return map[csvCat] || csvCat;
}

function getSubcategory(name, csvCat, sku) {
  const n = name.toUpperCase();
  if (BAG_SHOE_SKUS.has(sku) || csvCat === 'SHOES' || csvCat === 'LORO PIANA SLIDES' || csvCat === 'MALE LORO PIANA') {
    if (/SNEAKER|TRAINER|SLIP.IN|SKECHER|SKETCHER/.test(n)) return "Sneakers";
    if (/SANDAL|SLIPPER|WEDGE/.test(n)) return "Sandals & Slippers";
    if (/BOOT/.test(n)) return "Boots";
    if (/FLAT/.test(n)) return "Flats";
    if (/HEEL/.test(n)) return "Heels";
    if (/ZEGNA|FERRAGAMO|LORO PIANA|MCQUEEN|VALENTINO|MIU MIU|MANOLO|TORY BURCH|GUCCI|KENZO|LV/.test(n)) return "Designer Shoes";
    if (/MALE|MEN|CORP.*SHOE/.test(n)) return "Men's Shoes";
    return "Women's Shoes";
  }
  if (csvCat === 'ABAYAS') {
    if (/CHINESE/.test(n)) return 'Chinese Abayas';
    if (/2.PIECE|2PCS/.test(n)) return '2-Piece Abayas';
    if (/TONY/.test(n)) return 'Full Abayas';
    if (/STONED|BEADED/.test(n)) return 'Embellished Abayas';
    return 'Abayas';
  }
  if (csvCat === 'ACCESORIES' || csvCat === 'CAPS') {
    if (/EARRING|EARING/.test(n)) return 'Earrings';
    if (/BELT/.test(n)) return 'Belts';
    if (/KEY HOLDER/.test(n)) return 'Key Holders';
    if (/PHONE CASE/.test(n)) return 'Phone Cases';
    if (/CAP|HEAD WARMER/.test(n)) return 'Caps & Hats';
    if (/BANGLE/.test(n)) return 'Bangles';
    if (/BROOCH|BROCH/.test(n)) return 'Brooches';
    if (/TEDDY|LABUBU/.test(n)) return 'Novelty';
    if (/FAN/.test(n)) return 'Hand Fans';
    return 'Accessories';
  }
  if (csvCat === 'BAGS') {
    if (/BRIDAL/.test(n)) return 'Bridal Purses';
    if (/PURSE/.test(n)) return 'Purses';
    if (/SLING/.test(n)) return 'Sling Bags';
    if (/MAGNETIC|STONED/.test(n)) return 'Embellished Bags';
    if (/HANDBAG/.test(n)) return 'Handbags';
    if (/STEVE MADDEN|ALDO/.test(n)) return 'Designer Bags';
    return 'Handbags';
  }
  if (csvCat === 'BEAUTY') return 'Beauty Tools';
  if (csvCat === 'BODY CREAM') {
    if (/WHITENING|HALF CASTE|IVORY/.test(n)) return 'Whitening & Brightening';
    if (/GLOW|REPAIR/.test(n)) return 'Glow & Repair';
    if (/ANTI.AGING/.test(n)) return 'Anti-Aging';
    if (/SPF|MOISTURIZER/.test(n)) return 'Sun Protection';
    return 'Body Creams';
  }
  if (csvCat === 'CHILDREN') {
    if (/SHOE/.test(n)) return "Kids' Shoes";
    if (/GOWN/.test(n)) return "Kids' Gowns";
    if (/SUIT/.test(n)) return "Kids' Suits";
    if (/LEGGING/.test(n)) return "Kids' Bottoms";
    if (/PURSE/.test(n)) return "Kids' Accessories";
    return "Kids' Clothing";
  }
  if (csvCat === 'CHINA WEARS') {
    if (/PANT SET|SUIT/.test(n)) return 'Pant Suits';
    if (/BLAZER/.test(n)) return 'Blazers';
    if (/JACKET/.test(n)) return 'Jackets';
    return 'China Wears';
  }
  if (csvCat === 'CLEANSERS' || csvCat === 'FACE CREAM' || csvCat === 'SKIN CARE') {
    if (/SERUM/.test(n)) return 'Serums';
    if (/CLEANSER/.test(n)) return 'Cleansers';
    if (/MASK/.test(n)) return 'Face Masks';
    if (/CREAM/.test(n)) return 'Face Creams';
    if (/SPRAY/.test(n)) return 'Toners & Sprays';
    if (/ROSE WATER/.test(n)) return 'Toners & Sprays';
    return 'Skin Care';
  }
  if (csvCat === 'GIFT BOX') return 'Socks Gift Boxes';
  if (csvCat === 'GIFT ITEMS') {
    if (/KEY HOLDER/.test(n)) return 'Key Holders';
    if (/MUG|FLASK|BOTTLE/.test(n)) return 'Drinkware';
    if (/CHOCOLATE/.test(n)) return 'Edibles';
    return 'Gift Sets';
  }
  if (csvCat === 'HUMAN HAIR') return 'Human Hair Extensions';
  if (csvCat === 'JACKETS') return 'Jackets & Blazers';
  if (csvCat === 'JEWELRY') {
    if (/RING/.test(n)) return 'Rings';
    if (/BANGLE/.test(n)) return 'Bangles';
    if (/EARRING|EARING/.test(n)) return 'Earrings';
    if (/NECK PIECE|NECKLACE/.test(n)) return 'Necklaces';
    if (/BROOCH|BROCH/.test(n)) return 'Brooches';
    return 'Jewelry Sets';
  }
  if (csvCat === 'OILS AND SERUM') {
    if (/OIL/.test(n)) return 'Body Oils';
    return 'Serums';
  }
  if (csvCat === 'PANTYHOSE') return 'Pantyhose';
  if (csvCat === 'SCRUBS') return 'Body Scrubs';
  if (csvCat === 'SOAPS') return 'Soaps';
  if (csvCat === 'SPORT WEAR') return 'Sport Sets';
  if (csvCat === 'TIES') {
    if (/BOW/.test(n)) return 'Bow Ties';
    if (/CUFFLINK/.test(n)) return 'Cufflinks';
    if (/3.PIECE/.test(n)) return 'Tie Gift Sets';
    return 'Ties';
  }
  if (csvCat === 'TOYS') return 'Adult Toys';
  if (csvCat === 'TURKEY WEARS' || csvCat === 'U.S WEARS') {
    if (/ABAYA/.test(n)) return 'Abayas';
    if (/JUMPSUIT|PLAYSUIT/.test(n)) return 'Jumpsuits';
    if (/LEGGING|BUM SHORT|BIKER/.test(n)) return 'Bottoms';
    if (/CAMISOLE/.test(n)) return 'Tops & Shirts';
    if (/KAFTAN|BUBU/.test(n)) return 'Kaftans & Bubus';
    if (/SKIRT/.test(n) && /SUIT|JACKET/.test(n)) return 'Suits & Sets';
    if (/PANT SET|PANT SUIT|SUIT/.test(n) && !/GOWN/.test(n)) return 'Suits & Sets';
    if (/BLAZER/.test(n)) return 'Blazers';
    if (/T.SHIRT|T SHIRT/.test(n)) return 'T-Shirts';
    if (/SHIRT/.test(n) && !/GOWN/.test(n)) return 'Tops & Shirts';
    if (/TOP/.test(n) && !/GOWN/.test(n)) return 'Tops & Shirts';
    if (/SKIRT/.test(n) && !/SUIT/.test(n)) return 'Skirts';
    if (/JEAN|DENIM|PANT/.test(n) && !/GOWN/.test(n)) return 'Jeans & Trousers';
    if (/GOWN|DRESS|BODYCON|BODYCON/.test(n)) return 'Gowns & Dresses';
    if (/SINGLET|BOXERS|SHORTS/.test(n)) return "Men's Basics";
    if (/2.PIECE|2PCS/.test(n)) return 'Matching Sets';
    return csvCat === 'TURKEY WEARS' ? 'Turkey Wears' : 'U.S Wears';
  }
  return 'General';
}

function getDescription(name, csvCat) {
  const n = name;
  const templates = {
    'ABAYAS': `${n} — a beautifully crafted abaya with elegant detailing and premium fabric. Perfect for modest occasions and everyday wear, offering a graceful, flowing silhouette.`,
    'ACCESORIES': `${n} — a stylish accessory that adds a finishing touch to any look. Thoughtfully crafted for the fashion-conscious woman who loves the details.`,
    'CAPS': `${n} — a quality headwear piece that blends style and function. The perfect accessory for completing a casual or sporty look.`,
    'BAGS': `${n} — a chic and versatile bag designed for the modern woman. Spacious, elegant, and crafted to complement any outfit from casual to formal.`,
    'BEAUTY': `${n} — a professional beauty tool for effortless grooming. Designed for precision and ease of use, it delivers salon-quality results at home.`,
    'BODY CREAM': `${n} — a luxuriously formulated body cream for nourished, radiant skin. Enriched with quality ingredients to hydrate, repair, and beautify your skin daily.`,
    'CHILDREN': `${n} — a beautifully crafted piece for children, combining comfort with style. Made with quality fabric safe for kids, perfect for special occasions and everyday wear.`,
    'CHINA WEARS': `${n} — a sophisticated piece from the China Wears collection. Expertly tailored with quality fabric and refined details, ideal for formal and corporate occasions.`,
    'CLEANSERS': `${n} — a powerful yet gentle cleanser formulated to purify, brighten, and renew the skin. A daily essential for a healthy, glowing complexion.`,
    'FACE CREAM': `${n} — a premium face cream formulated to moisturize, target discoloration, and restore skin radiance. Gentle on the skin and suitable for daily use.`,
    'GIFT BOX': `${n} — a luxuriously curated gift box set featuring premium designer socks. The perfect thoughtful gift for men who appreciate quality and style.`,
    'GIFT ITEMS': `${n} — a delightful gift item perfect for special occasions, anniversaries, and celebrations. A thoughtful, memorable way to show someone you care.`,
    'HUMAN HAIR': `${n} — 100% premium human hair from Kentaz, known for its natural luster, softness, and durability. Ideal for long-lasting, natural-looking styles.`,
    'JACKETS': `${n} — a stylish jacket that instantly elevates any look. Crafted with quality fabric and expert tailoring for a confident, fashion-forward silhouette.`,
    'JEWELRY': `${n} — a stunning piece of fine jewelry crafted to add sparkle and elegance to any look. A beautiful gift for yourself or a loved one.`,
    'LORO PIANA SLIDES': `${n} — the iconic Loro Piana slide, crafted from the finest materials. Synonymous with Italian luxury, these slides offer unmatched comfort and understated elegance.`,
    'MALE LORO PIANA': `${n} — a masterpiece of Italian craftsmanship from Loro Piana. Combining premium suede with an iconic sole for a look of quiet, confident luxury.`,
    'OILS AND SERUM': `${n} — a targeted treatment formulated to nourish, brighten, and restore. Packed with active ingredients for visible results with consistent use.`,
    'PANTYHOSE': `${n} — premium quality pantyhose from Penti, crafted for comfort, durability, and style. Available in a beautiful design that elevates any outfit.`,
    'SCRUBS': `${n} — a deeply exfoliating scrub that buffs away dead skin to reveal brighter, smoother skin. Enriched with active brightening ingredients for a radiant glow.`,
    'SHOES': `${n} — a beautifully crafted pair of shoes that blends style, comfort, and quality. A versatile addition to any wardrobe that elevates every look.`,
    'SKIN CARE': `${n} — a premium KOEC skincare product formulated with advanced ingredients for targeted skin concerns. Clinically-inspired and crafted for visible, lasting results.`,
    'SOAPS': `${n} — a powerful brightening soap enriched with skin-loving ingredients. Gently cleanses while targeting uneven tone for a clearer, more luminous complexion.`,
    'SPORT WEAR': `${n} — a high-performance sportswear set designed for active women. Comfortable, breathable, and stylish — perfect for workouts, gym sessions, and athleisure wear.`,
    'TIES': `${n} — a premium quality tie crafted for the distinguished gentleman. Adds a polished, sophisticated finishing touch to any formal or business ensemble.`,
    'TOYS': `${n} — a premium adult pleasure toy designed for comfort and satisfaction. Made with body-safe materials and thoughtful engineering for a superior experience.`,
    'TURKEY WEARS': `${n} — a stunning piece from the Turkey Wears collection. Expertly crafted with quality fabric and impeccable finishing, bringing Turkish fashion elegance to your wardrobe.`,
    'U.S WEARS': `${n} — a stylish piece from the U.S Wears collection. Featuring quality construction and a contemporary design, it delivers effortless American fashion with a feminine touch.`,
  };
  return templates[csvCat] || `${n} — a premium fashion piece crafted for style and quality. A versatile addition to any wardrobe.`;
}

function getTags(name, csvCat, category) {
  const words = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the','and','with','size','from','for'].includes(w));
  const catTags = {
    'ABAYAS': ['abaya','modest fashion','traditional'],
    'ACCESORIES': ['accessories','fashion'],
    'CAPS': ['caps','headwear'],
    'BAGS': ['bags','handbag'],
    'BEAUTY': ['beauty','grooming'],
    'BODY CREAM': ['skincare','body cream','beauty'],
    'CHILDREN': ['kids','children'],
    'CHINA WEARS': ['china wears','fashion','womens'],
    'CLEANSERS': ['cleanser','skincare','beauty'],
    'FACE CREAM': ['face cream','skincare'],
    'GIFT BOX': ['gift','socks','luxury','men'],
    'GIFT ITEMS': ['gift','novelty'],
    'HUMAN HAIR': ['human hair','hair extension','kentaz'],
    'JACKETS': ['jacket','outerwear','womens'],
    'JEWELRY': ['jewelry','fashion','womens'],
    'LORO PIANA SLIDES': ['loro piana','slides','luxury','italian'],
    'MALE LORO PIANA': ['loro piana','men','luxury','italian','shoes'],
    'OILS AND SERUM': ['serum','oil','skincare','beauty'],
    'PANTYHOSE': ['pantyhose','hosiery','accessories'],
    'SCRUBS': ['scrub','exfoliator','skincare'],
    'SHOES': ['shoes','footwear'],
    'SKIN CARE': ['skincare','koec','beauty'],
    'SOAPS': ['soap','brightening','skincare'],
    'SPORT WEAR': ['sportswear','activewear','athleisure'],
    'TIES': ['ties','mens','formal','accessories'],
    'TOYS': ['adult toys','pleasure'],
    'TURKEY WEARS': ['turkey wears','fashion','womens'],
    'U.S WEARS': ['us wears','fashion','womens'],
  };
  return [...new Set([...words, ...(catTags[csvCat] || [])])].slice(0, 12);
}

// ── SEED ─────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let inserted = 0, skipped = 0;

  for (const [sku, csvCat, name, stock, price, costPrice] of RAW) {
    const slug = slugify(name);
    const exists = await Product.findOne({ $or: [{ barcode: sku }, { slug }] });
    if (exists) {
      console.log(`  SKIP: ${name}`);
      skipped++;
      continue;
    }
    const category   = getCategory(csvCat, sku);
    const subcategory = getSubcategory(name, csvCat, sku);
    const description = getDescription(name, csvCat);
    const tags        = getTags(name, csvCat, category);

    await Product.create({
      name, slug, description, category, subcategory, barcode: sku, tags,
      status: 'published',
      variants: [{ sku, price, costPrice, stock }],
    });
    console.log(`  OK [${category}/${subcategory}]: ${name}`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
