export type Memory = {
  id: number;
  date: string;
  title: string;
  preview: string;
  story: string;
  photos: string[];
  song: {
    title: string;
    artist: string;
    file: string;
  };
  secret: string;
  theme: "rose" | "lilac" | "gold" | "sky" | "berry";
};

export const memories: Memory[] = [
  {
    id: 1,
    date: "06 e 07 de junho de 2025",
    title: "O começo do nosso infinito",
    preview: "Dois dias que abriram a porta para tudo o que viria depois.",
    story:
      "Algumas histórias começam devagar. A nossa começou com cor, risadas e aquela sensação bonita de que eu tinha encontrado alguém diferente.",
    photos: [
      "/media/photos/memory-01-01.jpg",
      "/media/photos/memory-01-02.jpg",
      "/media/photos/memory-01-03.jpg",
      "/media/photos/memory-01-04.jpg",
    ],
    song: {
      title: "Já Sei Namorar",
      artist: "Tribalistas",
      file: "/media/audio/memory-01.mp3",
    },
    secret: "Foi aqui que o meu mundo começou a ganhar a sua cor favorita.",
    theme: "rose",
  },
  {
    id: 2,
    date: "29 de junho de 2025",
    title: "Um detalhe que ficou para sempre",
    preview: "Um gesto pequeno por fora e enorme por dentro.",
    story:
      "Há presentes que cabem na mão, mas guardam um universo inteiro. Esta lembrança é uma dessas: delicada, simples e completamente nossa.",
    photos: ["/media/photos/memory-02-01.jpg"],
    song: {
      title: "Velha Infância",
      artist: "Tribalistas",
      file: "/media/audio/memory-02.mp3",
    },
    secret: "Desde então, qualquer detalhe bonito me faz pensar em você.",
    theme: "gold",
  },
  {
    id: 3,
    date: "10 de julho de 2025",
    title: "A noite virou lembrança",
    preview: "Luzes ao redor, e eu só conseguia olhar para nós.",
    story:
      "A cidade continuava acontecendo, mas perto de você tudo parecia mais calmo. Uma noite comum ganhou um lugar permanente na minha memória.",
    photos: ["/media/photos/memory-03-01.jpg"],
    song: {
      title: "Ainda Bem",
      artist: "Vanessa da Mata",
      file: "/media/audio/memory-03.mp3",
    },
    secret: "Ainda bem que, no meio de tanta gente, a vida colocou você no meu caminho.",
    theme: "berry",
  },
  {
    id: 4,
    date: "09 de agosto de 2025",
    title: "Quando rir já era amor",
    preview: "Nossa melhor versão sempre aparece quando estamos brincando.",
    story:
      "Eu amo a nossa capacidade de transformar qualquer momento em piada, fotografia e saudade boa. Com você, ser feliz também é ser leve.",
    photos: ["/media/photos/memory-04-01.jpg"],
    song: {
      title: "Aliança",
      artist: "Tribalistas",
      file: "/media/audio/memory-04.mp3",
    },
    secret: "Seu sorriso continua sendo o meu lugar favorito.",
    theme: "lilac",
  },
  {
    id: 5,
    date: "Outubro de 2025",
    title: "Mar, fotos e nós dois",
    preview: "O tipo de dia que parece ter sido feito para guardar.",
    story:
      "Entre o mar, as fotografias e os nossos jeitos, criamos uma coleção de instantes que ainda fazem o meu coração sorrir.",
    photos: [
      "/media/photos/memory-05-01.jpg",
      "/media/photos/memory-05-02.jpg",
      "/media/photos/memory-05-03.jpg",
      "/media/photos/memory-05-04.jpg",
      "/media/photos/memory-05-05.jpg",
    ],
    song: {
      title: "No Escuro",
      artist: "Ana Gabriela & ANAVITÓRIA",
      file: "/media/audio/memory-05.mp3",
    },
    secret: "Se todas as luzes se apagassem, eu ainda reconheceria você.",
    theme: "sky",
  },
  {
    id: 6,
    date: "Novembro de 2025",
    title: "Flores, promessas e um anel",
    preview: "Quando carinho, surpresa e futuro couberam no mesmo dia.",
    story:
      "Flores sempre fizeram parte da nossa história. Nesta lembrança, elas vieram acompanhadas de algo ainda mais bonito: a vontade de continuar escolhendo você.",
    photos: [
      "/media/photos/memory-06-01.jpg",
      "/media/photos/memory-06-02.jpg",
      "/media/photos/memory-06-03.jpg",
      "/media/photos/memory-06-04.jpg",
    ],
    song: {
      title: "Ai, Amor",
      artist: "ANAVITÓRIA",
      file: "/media/audio/memory-06.mp3",
    },
    secret: "Mais de cem flores depois, nenhuma é tão bonita quanto você.",
    theme: "rose",
  },
  {
    id: 7,
    date: "21 de novembro de 2025",
    title: "Nosso lugar favorito",
    preview: "Não é um endereço. É qualquer lugar onde estamos juntos.",
    story:
      "Algumas fotografias não precisam de cenário. Basta a proximidade, o carinho e a certeza tranquila de estar exatamente onde eu queria.",
    photos: [
      "/media/photos/memory-07-01.jpg",
      "/media/photos/memory-07-02.jpg",
    ],
    song: {
      title: "Cor de Marte",
      artist: "ANAVITÓRIA",
      file: "/media/audio/memory-07.mp3",
    },
    secret: "Meu lugar favorito sempre começa onde a sua mão encontra a minha.",
    theme: "berry",
  },
  {
    id: 8,
    date: "30 de novembro de 2025",
    title: "Um buquê à beira-mar",
    preview: "Flores, chocolate e o céu mais bonito que novembro encontrou.",
    story:
      "Eu queria que aquele gesto dissesse tudo o que às vezes não cabe em palavras: que você merece beleza, cuidado e amor em todos os dias.",
    photos: [
      "/media/photos/memory-08-01.jpg",
      "/media/photos/memory-08-02.jpg",
      "/media/photos/memory-08-03.jpg",
    ],
    song: {
      title: "Lisboa",
      artist: "ANAVITÓRIA & Lenine",
      file: "/media/audio/memory-08.mp3",
    },
    secret: "Eu daria um jardim inteiro só para ver esse brilho nos seus olhos.",
    theme: "gold",
  },
  {
    id: 9,
    date: "Dezembro de 2025",
    title: "Coisas simples, amor enorme",
    preview: "Porque até um lanche vira história quando é com você.",
    story:
      "O extraordinário da nossa relação mora muito nas coisas simples. Dividir o dia, a comida, uma conversa e depois sentir saudade de tudo isso.",
    photos: [
      "/media/photos/memory-09-01.jpg",
    ],
    song: {
      title: "Ordinary",
      artist: "Alex Warren",
      file: "/media/audio/memory-09.mp3",
    },
    secret: "Você transformou o meu cotidiano na parte mais bonita da vida.",
    theme: "lilac",
  },
  {
    id: 10,
    date: "25 de dezembro de 2025",
    title: "Natal de mãos dadas",
    preview: "Um fim de ano com a certeza que eu queria levar para todos os outros.",
    story:
      "Naquele Natal, o melhor presente não estava embrulhado. Estava ali, segurando a minha mão e fazendo o futuro parecer ainda mais bonito.",
    photos: ["/media/photos/memory-10-01.jpg"],
    song: {
      title: "The First Time",
      artist: "Damiano David",
      file: "/media/audio/memory-10.mp3",
    },
    secret: "Que todos os próximos natais encontrem as nossas mãos assim.",
    theme: "rose",
  },
  {
    id: 11,
    date: "Janeiro de 2026",
    title: "Começar o ano com você",
    preview: "Um novo calendário, a mesma escolha bonita.",
    story:
      "Entrar em um novo ano ao seu lado fez cada plano parecer mais possível. O mar, o abraço e nós dois: o começo que eu desejaria repetir.",
    photos: [
      "/media/photos/memory-11-01.jpg",
      "/media/photos/memory-11-02.jpg",
      "/media/photos/memory-11-03.jpg",
    ],
    song: {
      title: "Japanese Denim",
      artist: "Daniel Caesar",
      file: "/media/audio/memory-11.mp3",
    },
    secret: "Meu melhor plano para qualquer ano ainda é continuar ao seu lado.",
    theme: "sky",
  },
  {
    id: 12,
    date: "01 de fevereiro de 2026",
    title: "Flores no caminho",
    preview: "Mais um capítulo contado em pétalas.",
    story:
      "Cada flor entregue a você carrega um pouco daquilo que eu sinto: cuidado, admiração e a vontade de tornar o seu dia mais bonito.",
    photos: [
      "/media/photos/memory-12-01.jpg",
      "/media/photos/memory-12-02.jpg",
    ],
    song: {
      title: "Best Part",
      artist: "H.E.R. & Daniel Caesar",
      file: "/media/audio/memory-12.mp3",
    },
    secret: "Você é a melhor parte de todas as minhas lembranças.",
    theme: "gold",
  },
  {
    id: 13,
    date: "08 de fevereiro de 2026",
    title: "A arte de estar ao seu lado",
    preview: "Um passeio bonito, visto pelos olhos mais bonitos.",
    story:
      "Entre quadros, reflexos e corredores, eu percebi mais uma vez que a minha obra favorita sempre seria a vida que construímos juntos.",
    photos: [
      "/media/photos/memory-13-01.jpg",
      "/media/photos/memory-13-02.jpg",
      "/media/photos/memory-13-03.jpg",
    ],
    song: {
      title: "Love",
      artist: "Keyshia Cole",
      file: "/media/audio/memory-13.mp3",
    },
    secret: "Eu visitaria mil galerias e ainda escolheria olhar para você.",
    theme: "lilac",
  },
  {
    id: 14,
    date: "22 de fevereiro de 2026",
    title: "Pequenos mundos nas nossas mãos",
    preview: "Cogumelos, anéis e um instante que só nós entendemos.",
    story:
      "Eu gosto das lembranças que parecem pequenas para o mundo, mas que para nós carregam uma história inteira. Esta é uma delas.",
    photos: [
      "/media/photos/memory-14-01.jpg",
      "/media/photos/memory-14-02.jpg",
    ],
    song: {
      title: "Adore You",
      artist: "Miley Cyrus",
      file: "/media/audio/memory-14.mp3",
    },
    secret: "Até os menores detalhes ficam gigantes quando pertencem a nós.",
    theme: "berry",
  },
  {
    id: 15,
    date: "Março de 2026",
    title: "Entre o mar e a tela",
    preview: "Dois cenários diferentes para a mesma companhia perfeita.",
    story:
      "Um horizonte aberto, uma sala escura e a mesma sensação de aconchego. Com você, o cenário muda, mas a felicidade permanece.",
    photos: [
      "/media/photos/memory-15-01.jpg",
      "/media/photos/memory-15-02.jpg",
    ],
    song: {
      title: "The Only Exception",
      artist: "Paramore",
      file: "/media/audio/memory-15.mp3",
    },
    secret: "Você é a exceção bonita que virou a minha certeza.",
    theme: "sky",
  },
  {
    id: 16,
    date: "12 de abril de 2026",
    title: "Nosso lado mais divertido",
    preview: "Porque sobreviver juntos também pode render boas risadas.",
    story:
      "Há espaço para romance, emoção e também para o nosso caos particular. Esta lembrança guarda o nosso jeito divertido de viver qualquer história.",
    photos: ["/media/photos/memory-16-01.jpg"],
    song: {
      title: "Sailor Song",
      artist: "Gigi Perez",
      file: "/media/audio/memory-16.mp3",
    },
    secret: "Em qualquer apocalipse, meu plano continua sendo encontrar você.",
    theme: "berry",
  },
  {
    id: 17,
    date: "02 de maio de 2026",
    title: "Toda flor lembra você",
    preview: "Mais um buquê, mais uma vez o meu coração inteiro.",
    story:
      "Talvez eu tenha dado tantas flores porque elas tentam dizer aquilo que sinto quando vejo você: delicadeza, vida e beleza por todos os lados.",
    photos: [
      "/media/photos/memory-17-01.jpg",
      "/media/photos/memory-17-02.jpg",
    ],
    song: {
      title: "K.",
      artist: "Cigarettes After Sex",
      file: "/media/audio/memory-17.mp3",
    },
    secret: "Nenhuma contagem de flores conseguiria medir o meu amor.",
    theme: "rose",
  },
  {
    id: 18,
    date: "23 de maio de 2026",
    title: "Um piquenique só nosso",
    preview: "O mundo desacelerou para caber naquela tarde.",
    story:
      "Não precisava de muito: alguma coisa para dividir, um pedaço de céu e você por perto. Foi assim que uma tarde virou memória favorita.",
    photos: ["/media/photos/memory-18-01.jpg"],
    song: {
      title: "Locked Out of Heaven",
      artist: "Bruno Mars",
      file: "/media/audio/memory-18.mp3",
    },
    secret: "A paz que eu procurava tinha o som da sua companhia.",
    theme: "gold",
  },
  {
    id: 19,
    date: "07 de junho de 2026",
    title: "Um ano escolhendo você",
    preview: "O tempo passou e a vontade de ficar só cresceu.",
    story:
      "Olhar para tudo o que vivemos até aqui é perceber quantas versões felizes de nós já existem. E eu ainda quero conhecer todas as próximas.",
    photos: [
      "/media/photos/memory-19-01.jpg",
      "/media/photos/memory-19-02.jpg",
      "/media/photos/memory-19-03.jpg",
    ],
    song: {
      title: "Fix You",
      artist: "Coldplay",
      file: "/media/audio/memory-19.mp3",
    },
    secret: "Eu escolheria você de novo em cada versão desta história.",
    theme: "lilac",
  },
  {
    id: 20,
    date: "25 de julho de 2026",
    title: "Até aqui — e para sempre",
    preview: "A memória mais recente antes de uma vida inteira de próximas.",
    story:
      "Este não é o fim do álbum. É apenas o ponto onde paramos para celebrar tudo o que já vivemos antes de continuar escrevendo o resto.",
    photos: [
      "/media/photos/memory-20-01.jpg",
      "/media/photos/memory-20-02.jpg",
    ],
    song: {
      title: "Anjos",
      artist: "Venere Vai Venus",
      file: "/media/audio/memory-20.mp3",
    },
    secret: "A próxima melhor memória ainda vai acontecer com você.",
    theme: "rose",
  },
];

export const specialSong = {
  title: "No Escuro",
  artist: "Ana Gabriela & ANAVITÓRIA",
  file: "/media/audio/memory-05.mp3",
};
