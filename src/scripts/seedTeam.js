require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const connectDB = require('../config/db');
const cloudinary = require('../config/cloudinary');
const TeamMember = require('../models/TeamMember');

const membersToSeed = [
  // KMSF Members
  {
    name: 'Dr Hiro Khoshnaw',
    position: 'Consultant Physician and Geriatrician and Chair of KMSF',
    image: '/Team/DrHeroXoshnaw.jpg',
    bio: 'Consultant Physician and Geriatrician at Royal Surrey NHS Foundation Trust and Chair of the KMSF Executive Board.',
    detail: 'Dr Hiro Khoshnaw, MD, MA, FRCP, FAcadMEd, is a Consultant Physician and Geriatrician at the Royal Surrey NHS Foundation Trust (RSFT). She has special interest in medical education and she is currently the Director of Medical Education at RSFT.\n\nDr Khoshnaw is also a fellow and Council member of The Academy of Medical Educators (AoME).\n\nDr Khoshnaw has been an active member of the KMSF leadership for many years and is currently the chair of KMSF Executive Board.',
    teamType: 'kmsf',
    order: 1
  },
  {
    name: 'Tara Tofec',
    position: 'KMSF Secretary, Company Secretary',
    image: '/Team/DrTara.jpg',
    bio: 'Active KMSF-UK member since 2018, organising medical conferences and charitable fundraising initiatives for Kurdish healthcare.',
    detail: 'Tara Tofec is a Kurdish British professional with a BSc in Chemistry from the University of Salahaddin, Iraq. She has extensive experience in administration, management, and customer service, having held leadership roles including supervisor at Bally Heathrow, Company Secretary at Metropolitan International Service, and Managing Director of Café Sorrento.\n\nSince 2018, she has been an active member of the Kurdistan Medical Scientific Federation (KMSF-UK), contributing to the organization of medical and scientific conferences and seminars. She also organises charitable initiatives, including fundraising events for cancer hospitals in the Kurdistan Region, particularly in Erbil and Sulaymaniyah, demonstrating her strong commitment to community and healthcare support.',
    teamType: 'kmsf',
    order: 2
  },

  // KSA Members
  {
    name: 'Dr Sayah Saied',
    position: 'Chair - Atomic Physicist',
    image: '/Team/Dr-Saya.jpeg',
    bio: 'One of the UK\'s most experienced specialists in surface analysis, with over 65 published papers and a distinguished career at Aston University spanning nearly three decades.',
    detail: 'Sayah Othman Saied\n\nOn coming from Kurdistan in 1976 with a B.Sc in Physics, she gained an M.Sc. and a Ph.D. Following the Ph.D. she was appointed to different roles and then employed at Aston in 1984 where she stayed until retirement in 2011.\n\nAt Aston she managed the University\'s surface analysis facilities in addition to her teaching. She ranked as one of the most experienced specialists in surface analysis in the UK and has published over 65 papers in quality journals.\n\nShe supervised research students and has held EPSRC grants. She has provided support to students and colleagues, being particularly active in the Kurdish community.\n\nFrom 2011 to 2024 she was a director of Midland Surface Analysis where she was responsible for solutions of industrial problems for UK and international companies.',
    teamType: 'ksa',
    order: 1
  },
  {
    name: 'Taban Hawezy',
    position: 'Secretary - Data Analyst',
    image: '/Team/Taban.jpg',
    bio: 'KSA Secretary and Data Consultant in financial services, passionate about empowering women in STEM and guiding the next generation of Kurdish talent.',
    detail: 'Taban is currently serving as the KSA Secretary. As a Kurd based in the Midlands, she is particularly motivated to contribute to a nation-wide community that supports and connects Kurdish academics and professionals. In her role, she helps facilitate initiatives that promote collaboration, knowledge-sharing, and engagement both within the KSA and across the KMSF.\n\nTaban holds a BSc in Economics from SOAS, University of London, and an MSc in Data Analytics from Northumbria University. Professionally, she works as a Data Consultant within the financial services sector, applying data-driven approaches to solve a variety of digital transformation challenges. She is especially passionate about empowering women in the workplace, particularly within STEM fields, and supporting students and early-career professionals as they navigate their paths into industry. She is keen to contribute to initiatives that guide and inspire the next generation of Kurdish talent as part of KMSF. Outside of her professional work, she enjoys watercolour painting, surfing, and travelling.',
    teamType: 'ksa',
    order: 2
  },
  {
    name: 'Dr Barzan Rahman',
    position: 'Treasurer - Psychologist',
    image: '/Team/Dr-Barzan.jpg',
    bio: 'Former Psychologist with a PhD in Applied Behaviour Analysis, now a property professional applying analytical skills to investment.',
    detail: 'Former Psychologist with a PhD in Applied Behaviour Analysis practiced in the field of traumatic brain injury. Clinical specialty in the assessment and treatment of complex and challenging behaviours. Research focus on behavioural interventions for adults with acquired brain injury, combining functional analyses with therapeutic applications. Prior clinical placements in private hospitals in Leeds and Northampton. Now a property professional, applying analytical and strategic skills to investment and development.\n\nHas 30 publications in peer reviewed journals with over 70 citations and is an international presenter in ISOUG and FMF.',
    teamType: 'ksa',
    order: 3
  },
  {
    name: 'Dr Aras Asaad',
    position: 'Machine Learning Scientist',
    image: '/Team/Dr - Aras.jpg',
    bio: 'Machine Learning Scientist at Oxford Innovation Centre and Honorary Research Fellow at Buckingham.',
    detail: 'Dr. Aras is a Machine Learning Scientist at Oxford Innovation Centre and Honorary Research Fellow at the University of Buckingham, UK. His research spans artificial intelligence, drug discovery, topological data analysis, medical image analysis, computer-aided diagnostics, and DeepFake detection. He supervises PhD and MSc students at Oxford, Durham, and Buckingham universities. His academic excellence has earned him multiple prestigious awards, including best paper honours from the IWDW Conference (2017), the London Mathematical Society (2019), and a Springer Award, with one publication ranked 2nd among 42,000 papers by Kscien. He is also CEO and Co-founder of DAAR AI, a UK-based health-tech startup company.',
    teamType: 'ksa',
    order: 4
  },
  {
    name: 'Araz Agha',
    position: 'Architect, Academic & Researcher',
    image: '/Team/araz agha.jpeg',
    bio: 'Architect, academic leader, and sustainability advocate integrating high-level design with international education.',
    detail: 'Architect, academic leader, and sustainability advocate Araz Agha integrates high-level design with international education. As a Fellow of CABE, Araz specialises in sustainable retrofitting and residential architecture. He currently serves as Head of Built Environment Courses and International Programme Leader at Coventry University, while also acting as Regional Manager (Europe & Central Asia).\n\nIn these roles, he oversees academic excellence across six universities in five countries. A prolific researcher with two books and over 27 articles, Araz is a leading voice in the transition to net-zero. His expertise in MMC, BREEAM, and Passive design ensures that he doesn’t just design buildings; he shapes the global academic standards defining the future of the construction industry.',
    teamType: 'ksa',
    order: 5
  },
  {
    name: 'Bayad Omar',
    position: 'Technology Consultant',
    image: '/Team/Dr-Bayad.jpg',
    bio: 'Technology Consultant at Oracle, supporting hospitals across the UK and Europe with digital transformation projects.',
    detail: 'Bayad Omar is a Technology Consultant at Oracle. The role involves supporting hospitals around the UK and Europe with their digital transformation projects. He holds a Masters degree in Medical Engineering from Cardiff University. His hobbies include learning languages, playing football and the Daf.',
    teamType: 'ksa',
    order: 6
  },
  {
    name: 'Niga S. Nawroly',
    position: 'Scientist, Immunologist',
    image: '/Team/Niga.jpg',
    bio: 'Experienced Immunologist, Biotechnologist, and Flow Cytometry Expert with 25+ years supporting scientists across the UK, Europe, Africa, and the Middle East.',
    detail: 'Niga Sirwan Nawroly is an experienced Immunologist, Biotechnologist, and Flow Cytometry Expert with a career spanning scientific research, the biotechnology industry, and pharmaceutical institutions.\n\nShe began her career as a researcher at several prestigious institutions, including Imperial College London, the Institute of Child Health, Queen Mary University of London, and the Kennedy Institute of Rheumatology.\n\nNiga is widely recognised within the international cytometry community as a scientific leader, speaker, and mentor. Over the past 25 years, she has trained and supported scientists and clinical researchers across the UK, Europe, Africa, and the Middle East in cytometry, immunophenotyping, business development and immunology.\n\nShe is also a passionate advocate for scientific leadership and diversity and is the Co-Founder and Chair of the HERizon Leadership Network, which supports under-represented women in drug discovery and scientific innovation.\n\nNiga has played an active role in shaping the scientific community through long-term professional service. She served as Secretary and Committee Member of the London Cytometry Club and has been involved with several scientific organisations, including the Cytometry Section of the Royal Microscopical Society (RMS). She also contributes to ELRIG (European Laboratory Research & Innovation Group) as a Scientific Programme Work Group Member and Scientific Director for High Content Imaging in Drug Discovery, and serves as a Committee Member of Augmented Health.',
    teamType: 'ksa',
    order: 7
  },
  {
    name: 'Dr Tahir Hassan',
    position: 'Senior Lecturer in AI and Data Science',
    image: '/Team/Dr-Tahir.jpeg',
    bio: 'Senior Lecturer in AI and Data Science at Solent University and Executive Committee member of KSA, specializing in deep learning and healthcare.',
    detail: 'Dr Tahir Hassan is a Senior Lecturer in Artificial Intelligence and Data Science at Solent University and an Executive Committee member of the Kurdistan Scientific Association (KSA). With a PhD in Computing, his expertise lies at the intersection of deep learning and healthcare, specifically focusing on fairness-aware AI and medical image analysis.\n\nFormerly a Research Fellow at the University of Surrey, Tahir led critical work on the OPTIMAM mammography dataset to improve diagnostic equity. He is a passionate advocate for explainable, mathematically grounded AI systems and dedicated to leveraging his UK-based expertise to support Kurdistan’s healthcare and academic advancement.',
    teamType: 'ksa',
    order: 8
  },
  {
    name: 'Dr Zana Hussain',
    position: 'Business Management',
    image: '/Team/Mr-Zana-Hussain.jpeg',
    bio: 'Education leader in the UK with a distinguished career spanning government colleges and private institutions across London and Essex, committed to advancing learning and community empowerment for Kurds.',
    detail: 'Zana Hussain is an education leader in the UK who worked as Director at Croydon College, a government college, from 2003 to 2010, then moved to go solo serving as Director and Principal of Excel College and Fairfield Academy since 2012.\n\nWith a strong commitment to advancing learning, professional development, and community empowerment — especially for Kurds — he has played a key role in shaping high‑quality educational pathways for diverse learners across London and Essex.',
    teamType: 'ksa',
    order: 9
  },

  // KuMA Members
  {
    name: 'Zhyar Said',
    position: 'Chair - Pharmacist, Lecturer & Director',
    image: '/Team/Zhyar.jpeg',
    bio: 'Chair of KuMA and founder of RevisePharma, the UK\'s largest private training company for foundation year pharmacists.',
    detail: 'Zhyar Said is the chair of KuMA but also runs the largest private training company in the UK for foundation year pharmacists, RevisePharma. After completing his MPharm at UEA, Zhyar pivoted into becoming a senior healthcare analyst, followed by becoming a senior lecturer all while building his own companies.\n\nAs well as RevisePharma, Zhyar runs a clinical services company, CliniTools, and also founded the charity, The PharmAssists\' Project where money is invested back into the local community to help those in need.\n\nZhyar is from Slemani, Kurdistan, and came to the UK at 10 months old. He is extremely proud of his Kurdish roots and you can always count on him to start the halperke line.',
    teamType: 'kuma',
    order: 1
  },
  {
    name: 'Dr Chinar Osman',
    position: 'Secretary - Consultant Neurologist',
    image: '/Team/DrChinarOsman.jpg',
    bio: 'Consultant Neurologist at University of Southampton NHS Trust with special interest in peripheral nerve disorders and neuromuscular conditions.',
    detail: 'MBBS, BSc (Hons), MRCP\n\nDr Osman graduated at Barts and The London School of Medicine and Dentistry and attained first-class honours in Neuroscience Intercalated BSc. Dr Osman has completed a fellowship in neuromuscular disorders and appointed in 2019 as a consultant neurologist at the University of Southampton NHS Trust with a special interest in peripheral nerve disorders.\n\nShe established the UK\'s first Neurology led-outpatient Plasma Exchange Service and is the lead for the Neurology Immunoglobulin service in the South-East region. She is a member of the neuromuscular advisory board for the Association of British Neurologists and a member of the Neurology SCE question writing committee. She is involved in various international clinical trials for MMN and CIDP and research publications.\n\nShe is a Trustee for a non-profit charity KR-UK Impakt founded in 2020 committed to improving mental health provision in the KRI.',
    teamType: 'kuma',
    order: 2
  },
  {
    name: 'Yar Ameen',
    position: 'Treasurer - Senior Paralegal',
    image: '/Team/YarAmeen.jpeg',
    bio: 'Manager at Admiral Law in Cardiff, leading a team of trainee paralegals specialising in personal injury and negligence, with international legal operations experience in Delhi.',
    detail: 'Yar Ameen is a Manager at Admiral Law in Cardiff, leading a team of trainee paralegals specialising in personal injury and negligence. She drives high standards in case handling, combining technical expertise with a strong focus on performance, client outcomes, and team development, working closely with medico-legal experts on complex reports.\n\nIn addition to her core role, Yar leads a strategic outsourcing project in Delhi, with extensive experience in establishing and scaling legal operations in an international market.\n\nBorn in Iraq and raised between Germany and the UK, Yar holds a BSc in Pharmaceutical Sciences from the University of Greenwich. She is currently studying with CILEX and has prior experience at Lloyds Banking Group and within Dubai\'s real estate sector, strengthening her commercial awareness and leadership capability.\n\nOutside of work, Yar is a keen long-distance runner and actively engages in community initiatives, alongside training in Muay Thai and boxing.',
    teamType: 'kuma',
    order: 3
  },
  {
    name: 'Dr Badenan Ibraheem Fathulla',
    position: 'Consultant Obstetrician & Gynaecologist',
    image: '/Team/Dr Badenan.jpeg',
    bio: 'Consultant Obstetrician and Gynaecologist at Royal Free London NHS Foundation Trust and Lead for Postnatal Services.',
    detail: 'Dr. Badenan Ibraheem Fathulla is a Consultant Obstetrician and Gynaecologist at the Royal Free London NHS Foundation Trust. She serves as Labour Ward Lead, Lead for Postnatal Services, and Lead for Postgraduate Medical Teaching and Education.\n\nDr. Fathulla grew up in Baghdad, Iraq, and graduated from Baghdad Medical School in 1984. Her clinical interests include high-risk pregnancies, gynaecological emergencies, and minimally invasive surgery.\n\nShe was awarded “Top Teacher” by University College Hospital London in recognition of her excellence in medical education. Dr. Fathulla is also a dedicated advocate for women’s health and rights.',
    teamType: 'kuma',
    order: 4
  },
  {
    name: 'Dr Dlovan',
    position: 'General Practitioner',
    image: '/Team/Dr Dlovan.jpeg',
    bio: 'General Practitioner with a specialist interest in metabolic health and diabetes management, based in South Wales.',
    detail: 'Dr Dlovan is a General Practitioner based in South Wales, with a specialist interest in metabolic health and diabetes management. Holding a Postgraduate Diploma in Diabetes from the University of South Wales and an MSc in Diabetes from Cardiff University, they bring an evidence-based approach to complex long-term conditions.\n\nTheir practice is patient-centred, integrating mindfulness and self-awareness to support individuals in understanding and managing their health.\n\nDr Dlovan has also contributed to medical education as a Clinical Teaching Fellow in Neurology and Honorary Lecturer at Cardiff University, and is committed to providing compassionate, high-quality, personalised care.',
    teamType: 'kuma',
    order: 5
  },
  {
    name: 'Dr Firiad Hiwaizi',
    position: 'Consultant Haematologist',
    image: '/Team/Dr-Fryad.jpeg',
    bio: 'Consultant Haematologist with a long career spanning the UK and Iraq, now focused on charity work and postgraduate teaching in Kurdistan.',
    detail: 'Dr Firiad Hiwaizi started his career as a doctor in 1966 after graduating from Baghdad Medical College. He worked his way to up to a senior position serving a small town for a year, as well as serving in the army for a year and a half, staying in Iraq until 1972.\n\nAt the time of peace between Kurdish liberation movement and Iraqi government, Dr Hiwaizi got a scholarship from the government to get a higher degree and specialise in haematology and attained his MRCP in 1976. He then started working in haematology mainly at St George’s, St Helier’s and the Royal Marsden hospitals.\n\nLater on in his career, he had his own private lab in London until retiring in 2020. Dr Hiwaizi’s main target now is charity work and taking part in haematology teaching in Kurdistan for postgraduate doctors and as examiner.\n\nDr Hiwaizi was born in the village of Tobzawa, completing primary and middle schools in Koya, and secondary school in Baghdad before starting his medical training in 1960 in Baghdad. Dr Hiwaizi is still taking part in Kurdish medical activities from a scientific and academic stance across Kurdistan and Europe; especially the UK.',
    teamType: 'kuma',
    order: 6
  },
  {
    name: 'Dr Hama Attar',
    position: 'Consultant Urological Surgeon',
    image: '/Team/Dr-HamaAttar.jpeg',
    bio: 'Consultant Urological Surgeon and Honorary Senior Clinical Lecturer at Imperial College, Head of Urology at Chelsea and Westminster Hospital, and award-winning clinician recognised for outstanding patient care since 2018.',
    detail: 'Mr Attar is a Consultant Urological Surgeon and an Honorary Senior Clinical Lecturer at Imperial College School of Medicine. He is the Head of the Urology Department at Chelsea and Westminster Hospital in Central London, a position he has held for the last 8 years. He has regularly been recognised for the provision of an outstandingly high level of patient care and has been awarded the Certificate of Excellence in Patient Care on a yearly basis since 2018.\n\nMr Attar is one of the lead urologists in London and runs a busy practice both in the NHS and the private sectors. He has a high reputation as a clinician, a manager and as a trainer of students and trainees.\n\nMr Attar specialises in general and diagnostic urology, with a primary focus on prostate cancer and bladder cancer diagnostics. He has a subspecialist interest in the endourological management of complex kidney stones, utilising minimally invasive techniques and advanced laser technology.\n\nMr Attar completed his higher surgical training in London, culminating in a final year at the prestigious University College London Hospital. He also undertook a research post in Neuro-Urology at the Spinal Injury Unit of the Royal National Orthopaedic Hospital in Stanmore, where he gained significant experience in managing conditions such as kidney and bladder stones, bladder overactivity, urinary incontinence, recurrent infections, and erectile dysfunction.\n\nBeing academically active, Mr Attar has published over 30 scientific articles in various urological journals and has presented his research at numerous international and national conferences. He is the Urology Firm Lead for Imperial Medical students. His dedication to both clinical excellence and academic contribution underscores his commitment to advancing the field of urology.',
    teamType: 'kuma',
    order: 7
  },
  {
    name: 'Dr Sanaria. A. Raouf',
    position: 'Consultant Obstetrician & Maternal Medicine',
    image: '/Team/Dr-Sanaria.jpeg',
    bio: 'Senior Consultant in Obstetrics and Fetal Medicine at University Hospitals of Derby and Burton NHS Foundation Trust.',
    detail: 'MBChB, MRCOG, FRCOG\nSenior Consultant in Obstetrics and Fetal Medicine\nUniversity Hospitals of Derby and Burton NHS Foundation Trust.UK DE22-3NE\n\nHas 24 years experience of NHS in UK and 16 years as a consultant and subspecialist in Fetal medicine and prenatal invasive and noninvasive diagnosis \nNational UK Maternity Units Marvel Awardee 2025- for providing outstanding care through complications in pregnancy \nFormer Clinical Director for Obstetrics in the 5th largest Maternity Unit in UK\nEast Midlands Regional lead for Preterm Birth Prevention and Fetal growth Restriction',
    teamType: 'kuma',
    order: 8
  },
  {
    name: 'Shilan Ghafoor',
    position: 'Pharmacist, Healthcare Policy Advisor',
    image: '/Team/Shilan.jpeg',
    bio: 'National medicines policy advisor with a career spanning primary and secondary care, focused on radiopharmaceuticals, supply chain resilience, and addressing health inequalities.',
    detail: 'Experienced clinical pharmacist with a varied career spanning both primary and secondary care. Currently working in a national role advising on medicines related policies (with a particular focus on radiopharmaceuticals and supply chain resilience), overseeing national mitigation and management of medicine supply issues and its communications into the system (including the launch and management of the Medicine Supply Tool on SPS).\n\nComfortable working across sectors and with a range of senior stakeholders in government, NHS and the private industry.\n\nPassionate about addressing health inequalities, genomic medicine and increasing diversity at all levels. A keen and enthusiastic aspiring future healthcare leader.',
    teamType: 'kuma',
    order: 9
  },
  {
    name: 'Dr Teshk Nakshbandi',
    position: 'General Practitioner',
    image: '/Team/Dr Teshk Nakshbandi.png',
    bio: 'General Practitioner based in rural Herefordshire with interests in exercise medicine, sports injuries, and rehabilitation.',
    detail: 'I am a General Practitioner based in rural Herefordshire. I graduated from Norwich Medical School in 2011, having previously completed a Pharmacy degree at University College London in 2003. I am originally from Sulaymania, Kurdistan, and was fortunate to spend part of my childhood between Sulaymania and Baghdad.\n\nI am married and the proud father of two beautiful daughters. My professional interests include exercise medicine, sports injuries, and rehabilitation, alongside a strong grounding in general medicine and gastroenterology.\n\nI hope to support KUMA and KSMF to the best of my ability.',
    teamType: 'kuma',
    order: 10
  },

  // Audio Visual Members
  {
    name: 'Aran Rahman-Jackson',
    position: 'Audio Visual Specialist',
    image: '/Team/Aran Rahman-Jackson.jpeg',
    bio: 'A 20-year-old DJ, music producer, and Audio Visual Specialist for KMSF, combining creative talent, technical skill, and community commitment.',
    detail: 'Aran Rahman-Jackson (known as Ary) is a 20-year-old DJ, music producer, and Audio Visual Specialist for KMSF. With over three years of study in music production, audio engineering, and media technology, he has performed at major KMSF events including Nawroz celebrations. Driven by his Kurdish heritage and lived experience with cerebral palsy, Aran is also a dedicated fundraiser, having raised £12,000 for mobility equipment sent to Kurdistan in memory of his grandfather and over £20,000 for Palestine through a 5K swim challenge. He combines creative talent, technical skill, and community commitment to make a lasting cultural impact.',
    teamType: 'audioVisual',
    order: 1
  }
];

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    console.log('Clearing existing team members...');
    await TeamMember.deleteMany({});

    console.log(`Starting to seed ${membersToSeed.length} team members and upload their images to Cloudinary in WebP format...`);

    const publicDir = path.join(__dirname, '../../../KMSF_Front/KMSF/public');

    for (let i = 0; i < membersToSeed.length; i++) {
      const member = membersToSeed[i];
      const localImgPath = path.join(publicDir, member.image);

      if (!fs.existsSync(localImgPath)) {
        console.error(`Local image not found for ${member.name} at: ${localImgPath}`);
        continue;
      }

      console.log(`Uploading image for ${member.name} (${localImgPath})...`);
      
      const uploadResult = await cloudinary.uploader.upload(localImgPath, {
        folder: 'kmsf-team',
        format: 'webp',
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
      });

      console.log(`Uploaded to Cloudinary: ${uploadResult.secure_url}`);

      await TeamMember.create({
        ...member,
        image: uploadResult.secure_url,
      });

      console.log(`Successfully saved ${member.name} to database.`);
    }

    console.log('All team members seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding team members:', error);
    process.exit(1);
  }
};

seedData();
