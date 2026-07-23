(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const BODY_PARTS =
    Object.freeze([
      {
        id: "chest",
        label: "가슴"
      },
      {
        id: "back",
        label: "등"
      },
      {
        id: "shoulders",
        label: "어깨"
      },
      {
        id: "legs",
        label: "하체"
      },
      {
        id: "biceps",
        label: "이두"
      },
      {
        id: "triceps",
        label: "삼두"
      },
      {
        id: "core",
        label: "코어"
      },
      {
        id: "full-body",
        label: "전신"
      },
      {
        id: "other",
        label: "기타"
      }
    ].map(
      (item) =>
        Object.freeze(item)
    ));

  const EQUIPMENT_OPTIONS =
    Object.freeze([
      {
        id: "barbell",
        label: "바벨"
      },
      {
        id: "dumbbell",
        label: "덤벨"
      },
      {
        id: "cable",
        label: "케이블"
      },
      {
        id: "machine",
        label: "머신"
      },
      {
        id: "smith-machine",
        label: "스미스 머신"
      },
      {
        id: "plate-loaded",
        label: "플레이트 로드"
      },
      {
        id: "bodyweight",
        label: "맨몸"
      },
      {
        id: "kettlebell",
        label: "케틀벨"
      },
      {
        id: "band",
        label: "밴드"
      },
      {
        id: "other",
        label: "기타"
      }
    ].map(
      (item) =>
        Object.freeze(item)
    ));

  const validBodyParts =
    new Set(
      BODY_PARTS.map(
        (item) => item.id
      )
    );

  const validEquipment =
    new Set(
      EQUIPMENT_OPTIONS.map(
        (item) => item.id
      )
    );

  function createTemplate(
    input
  ) {
    return Object.freeze({
      id:
        String(input.id),

      name:
        String(input.name),

      aliases:
        Object.freeze([
          ...(
            Array.isArray(
              input.aliases
            )
              ? input.aliases
              : []
          )
        ]),

      primaryBodyPart:
        String(
          input.primaryBodyPart ||
          "other"
        ),

      secondaryBodyParts:
        Object.freeze([
          ...(
            Array.isArray(
              input.secondaryBodyParts
            )
              ? input
                  .secondaryBodyParts
              : []
          )
        ]),

      movementPattern:
        String(
          input.movementPattern ||
          "other"
        ),

      recommendedEquipment:
        Object.freeze([
          ...(
            Array.isArray(
              input.recommendedEquipment
            )
              ? input
                  .recommendedEquipment
              : []
          )
        ])
    });
  }

  const templates =
    Object.freeze([
      createTemplate({
        id: "bench-press",
        name: "벤치프레스",
        aliases: [
          "벤치 프레스",
          "바벨 벤치프레스",
          "Barbell Bench Press"
        ],
        primaryBodyPart: "chest",
        secondaryBodyParts: [
          "triceps",
          "shoulders"
        ],
        movementPattern:
          "horizontal-push",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "smith-machine",
          "machine"
        ]
      }),

      createTemplate({
        id: "incline-bench-press",
        name: "인클라인 벤치프레스",
        aliases: [
          "인클라인 벤치",
          "Incline Bench Press"
        ],
        primaryBodyPart: "chest",
        secondaryBodyParts: [
          "triceps",
          "shoulders"
        ],
        movementPattern:
          "incline-push",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "smith-machine",
          "machine"
        ]
      }),

      createTemplate({
        id: "chest-press",
        name: "체스트 프레스",
        aliases: [
          "체스트프레스",
          "Chest Press"
        ],
        primaryBodyPart: "chest",
        secondaryBodyParts: [
          "triceps",
          "shoulders"
        ],
        movementPattern:
          "horizontal-push",
        recommendedEquipment: [
          "machine",
          "plate-loaded",
          "cable"
        ]
      }),

      createTemplate({
        id: "chest-fly",
        name: "체스트 플라이",
        aliases: [
          "펙덱 플라이",
          "케이블 플라이",
          "덤벨 플라이",
          "Chest Fly"
        ],
        primaryBodyPart: "chest",
        secondaryBodyParts: [],
        movementPattern:
          "horizontal-adduction",
        recommendedEquipment: [
          "dumbbell",
          "cable",
          "machine"
        ]
      }),

      createTemplate({
        id: "push-up",
        name: "푸시업",
        aliases: [
          "팔굽혀펴기",
          "Push Up"
        ],
        primaryBodyPart: "chest",
        secondaryBodyParts: [
          "triceps",
          "shoulders"
        ],
        movementPattern:
          "horizontal-push",
        recommendedEquipment: [
          "bodyweight",
          "band"
        ]
      }),

      createTemplate({
        id: "barbell-row",
        name: "바벨 로우",
        aliases: [
          "바벨로우",
          "Bent Over Row"
        ],
        primaryBodyPart: "back",
        secondaryBodyParts: [
          "biceps",
          "shoulders"
        ],
        movementPattern:
          "horizontal-pull",
        recommendedEquipment: [
          "barbell",
          "smith-machine"
        ]
      }),

      createTemplate({
        id: "pendlay-row",
        name: "펜들레이 로우",
        aliases: [
          "펜들레이로우",
          "Pendlay Row"
        ],
        primaryBodyPart: "back",
        secondaryBodyParts: [
          "biceps",
          "shoulders"
        ],
        movementPattern:
          "horizontal-pull",
        recommendedEquipment: [
          "barbell"
        ]
      }),

      createTemplate({
        id: "lat-pulldown",
        name: "랫풀다운",
        aliases: [
          "랫 풀다운",
          "Lat Pulldown"
        ],
        primaryBodyPart: "back",
        secondaryBodyParts: [
          "biceps"
        ],
        movementPattern:
          "vertical-pull",
        recommendedEquipment: [
          "cable",
          "machine"
        ]
      }),

      createTemplate({
        id: "pull-up",
        name: "풀업",
        aliases: [
          "턱걸이",
          "Pull Up",
          "Chin Up"
        ],
        primaryBodyPart: "back",
        secondaryBodyParts: [
          "biceps"
        ],
        movementPattern:
          "vertical-pull",
        recommendedEquipment: [
          "bodyweight",
          "band",
          "machine"
        ]
      }),

      createTemplate({
        id: "seated-row",
        name: "시티드 로우",
        aliases: [
          "시티드로우",
          "Seated Row"
        ],
        primaryBodyPart: "back",
        secondaryBodyParts: [
          "biceps",
          "shoulders"
        ],
        movementPattern:
          "horizontal-pull",
        recommendedEquipment: [
          "cable",
          "machine",
          "plate-loaded"
        ]
      }),

      createTemplate({
        id: "one-arm-row",
        name: "원암 로우",
        aliases: [
          "원 암 로우",
          "덤벨 로우",
          "One Arm Row"
        ],
        primaryBodyPart: "back",
        secondaryBodyParts: [
          "biceps"
        ],
        movementPattern:
          "horizontal-pull",
        recommendedEquipment: [
          "dumbbell",
          "cable",
          "machine"
        ]
      }),

      createTemplate({
        id: "overhead-press",
        name: "오버헤드 프레스",
        aliases: [
          "오버헤드프레스",
          "밀리터리 프레스",
          "OHP"
        ],
        primaryBodyPart: "shoulders",
        secondaryBodyParts: [
          "triceps"
        ],
        movementPattern:
          "vertical-push",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "smith-machine"
        ]
      }),

      createTemplate({
        id: "shoulder-press",
        name: "숄더 프레스",
        aliases: [
          "숄더프레스",
          "Shoulder Press"
        ],
        primaryBodyPart: "shoulders",
        secondaryBodyParts: [
          "triceps"
        ],
        movementPattern:
          "vertical-push",
        recommendedEquipment: [
          "dumbbell",
          "machine",
          "plate-loaded"
        ]
      }),

      createTemplate({
        id: "lateral-raise",
        name: "레터럴 레이즈",
        aliases: [
          "사이드 레터럴 레이즈",
          "측면 어깨 운동",
          "Lateral Raise"
        ],
        primaryBodyPart: "shoulders",
        secondaryBodyParts: [],
        movementPattern:
          "shoulder-abduction",
        recommendedEquipment: [
          "dumbbell",
          "cable",
          "machine",
          "band"
        ]
      }),

      createTemplate({
        id: "rear-delt-fly",
        name: "리어 델트 플라이",
        aliases: [
          "벤트오버 레터럴 레이즈",
          "후면 어깨 플라이",
          "Rear Delt Fly"
        ],
        primaryBodyPart: "shoulders",
        secondaryBodyParts: [
          "back"
        ],
        movementPattern:
          "horizontal-abduction",
        recommendedEquipment: [
          "dumbbell",
          "cable",
          "machine"
        ]
      }),

      createTemplate({
        id: "face-pull",
        name: "페이스 풀",
        aliases: [
          "페이스풀",
          "Face Pull"
        ],
        primaryBodyPart: "shoulders",
        secondaryBodyParts: [
          "back"
        ],
        movementPattern:
          "horizontal-pull",
        recommendedEquipment: [
          "cable",
          "band"
        ]
      }),

      createTemplate({
        id: "back-squat",
        name: "백 스쿼트",
        aliases: [
          "스쿼트",
          "바벨 스쿼트",
          "Back Squat"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [
          "core"
        ],
        movementPattern:
          "squat",
        recommendedEquipment: [
          "barbell",
          "smith-machine"
        ]
      }),

      createTemplate({
        id: "front-squat",
        name: "프론트 스쿼트",
        aliases: [
          "프론트스쿼트",
          "Front Squat"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [
          "core"
        ],
        movementPattern:
          "squat",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "kettlebell"
        ]
      }),

      createTemplate({
        id: "leg-press",
        name: "레그 프레스",
        aliases: [
          "레그프레스",
          "Leg Press"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [],
        movementPattern:
          "squat",
        recommendedEquipment: [
          "machine",
          "plate-loaded"
        ]
      }),

      createTemplate({
        id: "leg-extension",
        name: "레그 익스텐션",
        aliases: [
          "레그익스텐션",
          "Leg Extension"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [],
        movementPattern:
          "knee-extension",
        recommendedEquipment: [
          "machine"
        ]
      }),

      createTemplate({
        id: "leg-curl",
        name: "레그 컬",
        aliases: [
          "레그컬",
          "라잉 레그 컬",
          "Leg Curl"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [],
        movementPattern:
          "knee-flexion",
        recommendedEquipment: [
          "machine",
          "cable",
          "band"
        ]
      }),

      createTemplate({
        id: "romanian-deadlift",
        name: "루마니안 데드리프트",
        aliases: [
          "루마니안 데드",
          "RDL"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [
          "back"
        ],
        movementPattern:
          "hip-hinge",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "smith-machine"
        ]
      }),

      createTemplate({
        id: "lunge",
        name: "런지",
        aliases: [
          "워킹 런지",
          "리버스 런지",
          "Lunge"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [
          "core"
        ],
        movementPattern:
          "lunge",
        recommendedEquipment: [
          "bodyweight",
          "dumbbell",
          "barbell",
          "smith-machine"
        ]
      }),

      createTemplate({
        id: "calf-raise",
        name: "카프 레이즈",
        aliases: [
          "종아리 운동",
          "Calf Raise"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [],
        movementPattern:
          "plantar-flexion",
        recommendedEquipment: [
          "bodyweight",
          "dumbbell",
          "machine",
          "smith-machine"
        ]
      }),

      createTemplate({
        id: "biceps-curl",
        name: "바이셉스 컬",
        aliases: [
          "바벨 컬",
          "덤벨 컬",
          "이두 컬",
          "Biceps Curl"
        ],
        primaryBodyPart: "biceps",
        secondaryBodyParts: [],
        movementPattern:
          "elbow-flexion",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "cable",
          "machine"
        ]
      }),

      createTemplate({
        id: "hammer-curl",
        name: "해머 컬",
        aliases: [
          "해머컬",
          "Hammer Curl"
        ],
        primaryBodyPart: "biceps",
        secondaryBodyParts: [],
        movementPattern:
          "elbow-flexion",
        recommendedEquipment: [
          "dumbbell",
          "cable"
        ]
      }),

      createTemplate({
        id: "preacher-curl",
        name: "프리처 컬",
        aliases: [
          "프리처컬",
          "Preacher Curl"
        ],
        primaryBodyPart: "biceps",
        secondaryBodyParts: [],
        movementPattern:
          "elbow-flexion",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "cable",
          "machine"
        ]
      }),

      createTemplate({
        id: "triceps-pushdown",
        name: "트라이셉스 푸시다운",
        aliases: [
          "케이블 푸시다운",
          "삼두 푸시다운",
          "Triceps Pushdown"
        ],
        primaryBodyPart: "triceps",
        secondaryBodyParts: [],
        movementPattern:
          "elbow-extension",
        recommendedEquipment: [
          "cable",
          "band"
        ]
      }),

      createTemplate({
        id:
          "overhead-triceps-extension",
        name:
          "오버헤드 트라이셉스 익스텐션",
        aliases: [
          "오버헤드 삼두 익스텐션",
          "Overhead Triceps Extension"
        ],
        primaryBodyPart: "triceps",
        secondaryBodyParts: [],
        movementPattern:
          "elbow-extension",
        recommendedEquipment: [
          "dumbbell",
          "cable",
          "barbell"
        ]
      }),

      createTemplate({
        id: "skull-crusher",
        name: "스컬 크러셔",
        aliases: [
          "라잉 트라이셉스 익스텐션",
          "Skull Crusher"
        ],
        primaryBodyPart: "triceps",
        secondaryBodyParts: [],
        movementPattern:
          "elbow-extension",
        recommendedEquipment: [
          "barbell",
          "dumbbell"
        ]
      }),

      createTemplate({
        id: "plank",
        name: "플랭크",
        aliases: [
          "Plank"
        ],
        primaryBodyPart: "core",
        secondaryBodyParts: [],
        movementPattern:
          "anti-extension",
        recommendedEquipment: [
          "bodyweight"
        ]
      }),

      createTemplate({
        id: "crunch",
        name: "크런치",
        aliases: [
          "복부 크런치",
          "Crunch"
        ],
        primaryBodyPart: "core",
        secondaryBodyParts: [],
        movementPattern:
          "trunk-flexion",
        recommendedEquipment: [
          "bodyweight",
          "cable",
          "machine"
        ]
      }),

      createTemplate({
        id: "hanging-leg-raise",
        name: "행잉 레그 레이즈",
        aliases: [
          "행잉 레그레이즈",
          "Hanging Leg Raise"
        ],
        primaryBodyPart: "core",
        secondaryBodyParts: [],
        movementPattern:
          "hip-flexion",
        recommendedEquipment: [
          "bodyweight"
        ]
      }),

      createTemplate({
        id: "deadlift",
        name: "데드리프트",
        aliases: [
          "컨벤셔널 데드리프트",
          "Deadlift"
        ],
        primaryBodyPart: "full-body",
        secondaryBodyParts: [
          "back",
          "legs",
          "core"
        ],
        movementPattern:
          "hip-hinge",
        recommendedEquipment: [
          "barbell",
          "dumbbell"
        ]
      }),

      createTemplate({
        id: "hip-thrust",
        name: "힙 쓰러스트",
        aliases: [
          "힙쓰러스트",
          "Hip Thrust"
        ],
        primaryBodyPart: "legs",
        secondaryBodyParts: [
          "core"
        ],
        movementPattern:
          "hip-extension",
        recommendedEquipment: [
          "barbell",
          "dumbbell",
          "smith-machine",
          "machine"
        ]
      })
    ]);

  const templateMap =
    new Map(
      templates.map(
        (template) => [
          template.id,
          template
        ]
      )
    );

  function normalizeSearchText(
    value
  ) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase(
        "ko-KR"
      )
      .replace(/\s+/g, "");
  }

  function normalizeTemplateId(
    value
  ) {
    const id =
      String(value || "").trim();

    return templateMap.has(id)
      ? id
      : "";
  }

  function normalizeEquipment(
    value
  ) {
    const equipment =
      String(value || "").trim();

    return validEquipment.has(
      equipment
    )
      ? equipment
      : "other";
  }

  function normalizeBodyPart(
    value
  ) {
    const bodyPart =
      String(value || "").trim();

    return validBodyParts.has(
      bodyPart
    )
      ? bodyPart
      : "other";
  }

  function getTemplateById(
    templateId
  ) {
    return (
      templateMap.get(
        String(templateId || "")
          .trim()
      ) ||
      null
    );
  }

  function findTemplateByName(
    value
  ) {
    const query =
      normalizeSearchText(value);

    if (!query) {
      return null;
    }

    return (
      templates.find(
        (template) =>
          [
            template.name,
            ...template.aliases
          ].some(
            (name) =>
              normalizeSearchText(
                name
              ) === query
          )
      ) ||
      null
    );
  }

  function searchTemplates(
    options = {}
  ) {
    const query =
      normalizeSearchText(
        options.query
      );

    const bodyPart =
      String(
        options.bodyPart ||
        "all"
      );

    const equipment =
      String(
        options.equipment ||
        "all"
      );

    return templates.filter(
      (template) => {
        if (
          bodyPart !== "all" &&
          template.primaryBodyPart !==
            bodyPart
        ) {
          return false;
        }

        if (
          equipment !== "all" &&
          !template
            .recommendedEquipment
            .includes(equipment)
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchableText =
          normalizeSearchText(
            [
              template.name,
              ...template.aliases,
              template.movementPattern
            ].join(" ")
          );

        return searchableText
          .includes(query);
      }
    );
  }

  function getBodyPartLabel(
    bodyPartId
  ) {
    return (
      BODY_PARTS.find(
        (item) =>
          item.id === bodyPartId
      )?.label ||
      "기타"
    );
  }

  function getEquipmentLabel(
    equipmentId
  ) {
    return (
      EQUIPMENT_OPTIONS.find(
        (item) =>
          item.id === equipmentId
      )?.label ||
      "기타"
    );
  }

  window.JYMLog.exerciseCatalog =
    Object.freeze({
      bodyParts:
        BODY_PARTS,

      equipmentOptions:
        EQUIPMENT_OPTIONS,

      templates,

      listTemplates() {
        return [...templates];
      },

      getTemplateById,

      findTemplateByName,

      searchTemplates,

      normalizeTemplateId,

      normalizeEquipment,

      normalizeBodyPart,

      getBodyPartLabel,

      getEquipmentLabel
    });
})();
