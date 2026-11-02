// Playtest balancing values. This version models three small businesses, not family or combat systems.
export const rules = Object.freeze({
  version: 1, initialMoney: 45, capacity: 60, daysPerSeason: 30,
  workMinutes: 120, workWage: 18, workSkill: 6, workEnergy: 18,
  travelMinutes: 15, livingCost: 2, maintenanceCost: 1,
  hungerPerHour: 3, energyPerHour: 1, leaseSkill: 20,
  repairRate: .5, repairMinimum: 5,
});

export const skillLabels = Object.freeze({ farm: '种植', fish: '养鱼', noodle: '面食经营', cooking: '厨艺' });
export const locationCatalog = Object.freeze({
  home: { id: 'home', name: '自家小院', description: '吃饭、歇息，盘算盘今日收支。' },
  village: { id: 'village', name: '山村巷口', description: '小卖部、租约与村邻都在这里。' },
  field: { id: 'field', name: '梯田菜畦', description: '先跟农师做活，再租一小块自己的田。' },
  pond: { id: 'pond', name: '溪边鱼塘', description: '学喂料与看水，留心跨日的饲料消耗。' },
  market: { id: 'market', name: '集镇早市', description: '跟面馆师傅学艺，按行情定价卖出真正的货物。' },
});

export const businessCatalog = Object.freeze({
  farm: { id: 'farm', name: '一畦菜田', location: 'field', skill: 'farm', leaseCost: 70, dailyRent: 4,
    growthDays: 2, minutes: 60, energy: 15, wear: 4, product: 'vegetables', inputs: { seed: 2, water: 1 },
    description: '播种耗菜种和水，两天后收菜；本领越好，收成和品质越高。' },
  fish: { id: 'fish', name: '一口小塘', location: 'pond', skill: 'fish', leaseCost: 90, dailyRent: 5,
    growthDays: 2, minutes: 60, energy: 15, wear: 5, product: 'fish', inputs: { fingerling: 8, feed: 2 },
    description: '开塘费之外还需另备鱼苗与料钱：一批8尾苗、2份饲料；收鱼前每天再喂1份。成熟后未收也要喂，缺料会少活一尾；刚开塘可继续帮工攒生产本钱。' },
  noodle: { id: 'noodle', name: '集镇面摊', location: 'market', skill: 'noodle', leaseCost: 85, dailyRent: 5,
    growthDays: 0, minutes: 90, energy: 16, wear: 5, product: 'noodles', inputs: { flour: 2, vegetables: 1, water: 1 },
    description: '真材实料做一锅面，当天就能卖；摊位租金每天照付。' },
});

export const itemCatalog = Object.freeze({
  bread: { id: 'bread', name: '杂粮饼', buy: 4, hunger: 30, energy: 4, description: '买来即可吃。' },
  seed: { id: 'seed', name: '菜种', buy: 3, description: '一轮菜田用两份。' },
  feed: { id: 'feed', name: '鱼饲料', buy: 3, description: '放养用两份，收鱼前每天一份。' },
  fingerling: { id: 'fingerling', name: '鱼苗', buy: 2, description: '一批投入8尾，实际消耗；养鱼本领决定成活数，鱼不会凭空出现。' },
  flour: { id: 'flour', name: '面粉', buy: 4, description: '面摊和家常饭的原料。' },
  water: { id: 'water', name: '清水', buy: 1, description: '种菜与做饭都要用。' },
  vegetables: { id: 'vegetables', name: '青菜', buy: 5, basePrice: 6, demand: 12 },
  fish: { id: 'fish', name: '鲜鱼', buy: 0, basePrice: 12, demand: 8 },
  noodles: { id: 'noodles', name: '手作面', buy: 0, basePrice: 12, demand: 10, hunger: 40, energy: 6 },
  meal: { id: 'meal', name: '家常热饭', buy: 0, hunger: 55, energy: 12 },
});

export const priceCatalog = Object.freeze({
  conservative: { name: '薄利快销', price: .85, demand: 1.3 },
  normal: { name: '平常价', price: 1, demand: 1 },
  high: { name: '高价试卖', price: 1.35, demand: .55 },
});

export const contextLocations = Object.freeze({
  'npc-farmer': 'field', 'npc-fisher': 'pond', 'npc-cook': 'market',
  'npc-shop': 'village', 'npc-broker': 'village',
  home: 'home', village: 'village', field: 'field', pond: 'pond', market: 'market',
});
