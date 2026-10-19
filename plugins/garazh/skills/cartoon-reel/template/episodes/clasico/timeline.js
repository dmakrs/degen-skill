// «El Clásico» — DOXA-рилс: сова покупает YES на победу Реала по 25¢, Барса забивает, график падает до 3%,
// Реал отыгрывается на 90+1' и 90+4' — RESOLVED YES, $1,000 → $4,000, финал — празднование. Музыка — только бит с победы.
// Сцены голов на ТВ длинные (2.2–2.8 с): зритель должен успеть прочитать GOAL! и счёт.
const TIMELINE = {
 duration: 27.4,
 look: "degen",
 bpm: 128,
 stage: {
  back: "sofaBack",
  front: "sofaFront",
  cast: {
   owl: {
    x: 0,
    y: 0,
    s: 1
   }
  }
 },
 shots: [
  {
   id: "sofa",
   set: "stage",
   from: 0,
   to: 1.6,
   cast: [
    "owl"
   ],
   cam: [
    [
     0,
     360,
     700,
     1
    ],
    [
     1.6,
     360,
     690,
     1.06
    ]
   ]
  },
  {
   id: "tv1",
   set: "tv",
   from: 1.6,
   to: 3,
   cam: [
    [
     1.6,
     360,
     540,
     1.25
    ],
    [
     3,
     360,
     540,
     1.34
    ]
   ]
  },
  {
   id: "buy",
   set: "market",
   market: "madrid",
   from: 3,
   to: 7,
   cam: [
    [
     3,
     360,
     640,
     1
    ],
    [
     7,
     360,
     640,
     1.03
    ]
   ]
  },
  {
   id: "tv2",
   set: "tv",
   from: 7,
   to: 9.2,
   cam: [
    [
     7,
     340,
     540,
     1.28
    ],
    [
     9.2,
     330,
     540,
     1.36
    ]
   ]
  },
  {
   id: "shock",
   set: "stage",
   from: 9.2,
   to: 10.3,
   cast: [
    "owl"
   ],
   shakeIn: 8,
   cam: {
    preset: "cu:owl",
    s: 1.9
   }
  },
  {
   id: "drop",
   set: "market",
   market: "madrid",
   from: 10.3,
   to: 13.3,
   cam: [
    [
     10.3,
     360,
     640,
     1
    ],
    [
     13.3,
     360,
     650,
     1.05
    ]
   ]
  },
  {
   id: "tv3",
   set: "tv",
   from: 13.3,
   to: 14.3,
   cam: [
    [
     13.3,
     380,
     540,
     1.28
    ],
    [
     14.3,
     410,
     540,
     1.38
    ]
   ]
  },
  {
   id: "pillow",
   set: "stage",
   from: 14.3,
   to: 15.3,
   cast: [
    "owl"
   ],
   cam: {
    preset: "mid:owl",
    s: 1.35
   }
  },
  {
   id: "tv4",
   set: "tv",
   from: 15.3,
   to: 17.8,
   cam: [
    [
     15.3,
     400,
     540,
     1.3
    ],
    [
     17.8,
     380,
     540,
     1.22
    ]
   ]
  },
  {
   id: "up1",
   set: "market",
   market: "madrid",
   from: 17.8,
   to: 18.6,
   cam: [
    [
     17.8,
     360,
     640,
     1
    ],
    [
     18.6,
     360,
     640,
     1.04
    ]
   ]
  },
  {
   id: "tv5",
   set: "tv",
   from: 18.6,
   to: 21.4,
   cam: [
    [
     18.6,
     400,
     540,
     1.3
    ],
    [
     21.4,
     360,
     540,
     1.22
    ]
   ]
  },
  {
   id: "resolve",
   set: "market",
   market: "madrid",
   from: 21.4,
   to: 22.4,
   cam: [
    [
     21.4,
     360,
     640,
     1
    ],
    [
     22.4,
     360,
     620,
     1.06
    ]
   ]
  },
  {
   id: "win1",
   set: "stage",
   from: 22.4,
   to: 24,
   cast: [
    "owl"
   ],
   cam: [
    [
     22.4,
     360,
     690,
     1
    ],
    [
     24,
     360,
     680,
     1.06
    ]
   ]
  },
  {
   id: "win2",
   set: "stage",
   from: 24,
   to: 25.6,
   cast: [
    "owl"
   ],
   cam: {
    preset: "cu:owl",
    s: 1.6
   }
  },
  {
   id: "win3",
   set: "stage",
   from: 25.6,
   to: 27.4,
   cast: [
    "owl"
   ],
   cam: [
    [
     25.6,
     360,
     700,
     0.95
    ],
    [
     27.4,
     360,
     690,
     1.04
    ]
   ]
  }
 ],
 pnl: {
  show: [
   [
    0,
    3
   ],
   [
    7,
    10.3
   ],
   [
    13.3,
    17.8
   ],
   [
    18.6,
    21.4
   ],
   [
    22.4,
    27.4
   ]
  ],
  keys: [
   {
    t: 0,
    v: 1000,
    flat: true
   },
   {
    t: 7.3,
    v: -400
   },
   {
    t: 13.3,
    v: -880
   },
   {
    t: 15.7,
    v: 1000
   },
   {
    t: 18.9,
    v: 2960
   },
   {
    t: 22.4,
    v: 1000,
    flat: true
   },
   {
    t: 22.75,
    v: 4000,
    dur: 0.9
   }
  ]
 },
 badges: [
  {
   from: 0.3,
   to: 1.6,
   name: "DOXA",
   role: "CEO · ORACLE · ULTRAS",
   color: "#f6c445",
   x: 24,
   y: 210,
   rot: -4
  }
 ],
 events: {
  shakes: [
   [
    7.3,
    10,
    0.3
   ],
   [
    15.7,
    18,
    0.45
   ],
   [
    18.9,
    14,
    0.35
   ],
   [
    21.9,
    10,
    0.3
   ],
   [
    22.4,
    12,
    0.3
   ]
  ]
 },
 env: {
  tv: [
   {
    t: 0,
    v: "#7cd67a"
   }
  ],
  tvflash: [
   {
    t: 0,
    v: 0
   },
   {
    t: 15.7,
    v: 1,
    dur: 0.05
   },
   {
    t: 15.8,
    v: 0,
    dur: 0.4
   }
  ],
  pillow: [
   {
    t: 0,
    v: 0
   },
   {
    t: 14.3,
    v: 1
   },
   {
    t: 15.3,
    v: 0
   }
  ],
  rain: [
   {
    t: 0,
    v: 0
   },
   {
    t: 22.4,
    v: 1
   },
   {
    t: 27.4,
    v: 0
   }
  ]
 },
 tv: {
  home: "RMA",
  away: "FCB",
  clock: [
   {
    t: 0,
    v: 4338
   },
   {
    t: 1.6,
    v: 4372,
    dur: 1.4
   },
   {
    t: 7,
    v: 4685
   },
   {
    t: 13.3,
    v: 5340
   },
   {
    t: 13.31,
    v: 5360,
    dur: 0.99
   },
   {
    t: 15.3,
    v: 5440
   },
   {
    t: 15.31,
    v: 5470,
    dur: 2.49
   },
   {
    t: 18.6,
    v: 5610
   },
   {
    t: 18.61,
    v: 5640,
    dur: 2.79
   }
  ],
  ball: [
   {
    t: 0,
    v: [
     0.45,
     0.55
    ]
   },
   {
    t: 1.6,
    v: [
     0.62,
     0.4
    ],
    dur: 1.4
   },
   {
    t: 7,
    v: [
     0.28,
     0.42
    ]
   },
   {
    t: 7.05,
    v: [
     0,
     0.5
    ],
    dur: 0.25
   },
   {
    t: 13.3,
    v: [
     0.55,
     0.5
    ]
   },
   {
    t: 13.35,
    v: [
     0.82,
     0.35
    ],
    dur: 0.95
   },
   {
    t: 15.3,
    v: [
     0.8,
     0.62
    ]
   },
   {
    t: 15.35,
    v: [
     1,
     0.5
    ],
    dur: 0.35
   },
   {
    t: 18.6,
    v: [
     0.78,
     0.3
    ]
   },
   {
    t: 18.65,
    v: [
     1,
     0.5
    ],
    dur: 0.25
   },
   {
    t: 20.4,
    v: [
     0.5,
     0.5
    ]
   }
  ],
  goals: [
   {
    t: 7.3,
    team: "away"
   },
   {
    t: 15.7,
    team: "home"
   },
   {
    t: 18.9,
    team: "home"
   }
  ],
  final: 20.4
 },
 cast: {
  owl: {
   poses: {
    L: [
     {
      t: 0,
      pose: "rest"
     },
     {
      t: 9.2,
      pose: "down"
     },
     {
      t: 10.3,
      pose: "rest"
     },
     {
      t: 14.3,
      pose: "rest",
      wrist: [
       292,
       930
      ],
      layer: "front",
      bob: 0
     },
     {
      t: 15.3,
      pose: "rest"
     },
     {
      t: 22.4,
      pose: "point",
      at: "up"
     },
     {
      t: 22.87,
      pose: "spread"
     },
     {
      t: 23.34,
      pose: "point",
      at: "up"
     },
     {
      t: 23.81,
      pose: "spread"
     },
     {
      t: 24.28,
      pose: "point",
      at: "up"
     },
     {
      t: 24.74,
      pose: "spread"
     },
     {
      t: 25.21,
      pose: "point",
      at: "up"
     },
     {
      t: 25.68,
      pose: "spread"
     },
     {
      t: 26.15,
      pose: "point",
      at: "up"
     },
     {
      t: 26.62,
      pose: "spread"
     },
     {
      t: 27.09,
      pose: "point",
      at: "up"
     }
    ],
    R: [
     {
      t: 0,
      pose: "rest"
     },
     {
      t: 9.2,
      pose: "down"
     },
     {
      t: 10.3,
      pose: "rest"
     },
     {
      t: 14.3,
      pose: "rest",
      wrist: [
       430,
       930
      ],
      layer: "front",
      bob: 0
     },
     {
      t: 15.3,
      pose: "rest"
     },
     {
      t: 22.4,
      pose: "spread"
     },
     {
      t: 22.87,
      pose: "point",
      at: "up"
     },
     {
      t: 23.34,
      pose: "spread"
     },
     {
      t: 23.81,
      pose: "point",
      at: "up"
     },
     {
      t: 24.28,
      pose: "spread"
     },
     {
      t: 24.74,
      pose: "point",
      at: "up"
     },
     {
      t: 25.21,
      pose: "spread"
     },
     {
      t: 25.68,
      pose: "point",
      at: "up"
     },
     {
      t: 26.15,
      pose: "spread"
     },
     {
      t: 26.62,
      pose: "point",
      at: "up"
     },
     {
      t: 27.09,
      pose: "spread"
     }
    ],
    head: [
     {
      t: 0,
      tilt: 3
     },
     {
      t: 0.8,
      tilt: -2
     },
     {
      t: 9.2,
      tilt: 0
     },
     {
      t: 9.5,
      tilt: 6
     },
     {
      t: 14.3,
      tilt: -3
     },
     {
      t: 22.4,
      tilt: -6
     },
     {
      t: 24,
      tilt: 5
     },
     {
      t: 25.6,
      tilt: -4
     }
    ]
   },
   tracks: {
    lid: [
     {
      t: 0,
      v: 0.35
     },
     {
      t: 14.3,
      v: 0.1
     },
     {
      t: 15.3,
      v: 0.45
     }
    ],
    slip: [
     {
      t: 0,
      v: 0
     },
     {
      t: 14.3,
      v: 0.55,
      dur: 0.2
     },
     {
      t: 15.3,
      v: 0
     }
    ],
    sweat: [
     {
      t: 0,
      v: 0
     },
     {
      t: 14.2,
      v: 1
     },
     {
      t: 15.5,
      v: 0
     }
    ],
    grin: [
     {
      t: 0,
      v: 0
     },
     {
      t: 22.4,
      v: 0.9
     }
    ],
    dance: [
     {
      t: 0,
      v: 0
     },
     {
      t: 22.4,
      v: 1
     }
    ]
   },
   events: {
    shock: [
     [
      9.25,
      10.25
     ]
    ],
    blink: [
     1.2
    ]
   }
  }
 },
 markets: {
  madrid: {
   cat: "Sport",
   title: "Real Madrid to win El Clásico?",
   ends: "Today",
   icon: "⚽",
   iconBg: "#ffffff",
   vol: "$18.6M",
   chart: {
    seed: 5,
    n: 40,
    path: [
     31,
     29,
     27,
     26,
     25
    ]
   },
   prob: [
    {
     t: 0,
     v: 25
    },
    {
     t: 7.3,
     v: 15,
     dur: 0.3
    },
    {
     t: 10.5,
     v: 3,
     dur: 1.8
    },
    {
     t: 17.85,
     v: 50,
     dur: 0.5
    },
    {
     t: 21.45,
     v: 99,
     dur: 0.3
    }
   ],
   select: [
    {
     t: 0,
     v: ""
    },
    {
     t: 3.55,
     v: "yes"
    }
   ],
   amount: [
    {
     t: 0,
     v: 0
    },
    {
     t: 4.1,
     v: 1,
     dur: 0.9
    }
   ],
   amtMin: 100,
   amtMax: 1000,
   press: [
    5.8
   ],
   pos: {
    show: [
     [
      6,
      22.4
     ]
    ],
    entry: "25¢",
    pnl: [
     {
      t: 0,
      v: 0
     },
     {
      t: 7.3,
      v: -400,
      dur: 0.3
     },
     {
      t: 10.5,
      v: -880,
      dur: 1.8
     },
     {
      t: 17.85,
      v: 1000,
      dur: 0.5
     },
     {
      t: 21.45,
      v: 2960,
      dur: 0.3
     },
     {
      t: 21.9,
      v: 3000
     }
    ]
   },
   resolve: {
    t: 21.9,
    outcome: "YES"
   },
   alert: [
    [
     10.5,
     13.3
    ]
   ],
   cursor: [
    {
     t: 0,
     v: [
      620,
      1180
     ]
    },
    {
     t: 3.15,
     v: [
      200,
      826
     ],
     dur: 0.35
    },
    {
     t: 3.85,
     v: [
      110,
      936
     ],
     dur: 0.2
    },
    {
     t: 4.1,
     v: [
      610,
      936
     ],
     dur: 0.9
    },
    {
     t: 5.25,
     v: [
      360,
      1018
     ],
     dur: 0.4
    },
    {
     t: 6.3,
     v: [
      640,
      1190
     ],
     dur: 0.5
    }
   ],
   clicks: [
    3.55,
    5.8
   ]
  }
 }
};
