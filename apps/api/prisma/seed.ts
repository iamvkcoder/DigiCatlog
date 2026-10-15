import { PrismaClient, Role, ShopStatus } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const defaultOpeningHours = {
  monday: { open: '09:00', close: '22:00', isClosed: false },
  tuesday: { open: '09:00', close: '22:00', isClosed: false },
  wednesday: { open: '09:00', close: '22:00', isClosed: false },
  thursday: { open: '09:00', close: '22:00', isClosed: false },
  friday: { open: '09:00', close: '23:00', isClosed: false },
  saturday: { open: '10:00', close: '23:00', isClosed: false },
  sunday: { open: '10:00', close: '21:00', isClosed: false },
};

async function main() {
  console.log('🌱 Starting DIGICATLOG database seed...');

  // Clean existing data for idempotency
  await prisma.auditLog.deleteMany();
  await prisma.qrScan.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shopSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();

  const superAdminLogin = process.env.SUPER_ADMIN_LOGIN || 'superadmin';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@DigiCatlog2025!';
  const superAdminHash = await argon2.hash(superAdminPassword);

  const superAdmin = await prisma.user.create({
    data: {
      loginId: superAdminLogin,
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
      mustChangePassword: false,
      isActive: true,
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.loginId}`);

  // Demo Shop 1: Bella Italia Ristorante
  const shop1 = await prisma.shop.create({
    data: {
      name: 'Bella Italia Ristorante',
      slug: 'bella-italia',
      status: ShopStatus.ACTIVE,
      settings: {
        create: {
          brandColor: '#8B4513',
          templateKey: 'classic-cream',
          currency: 'USD',
          phone: '+1 (555) 234-5678',
          whatsapp: '+15552345678',
          address: '45 Via Olive, Little Italy, NY 10013',
          mapsUrl: 'https://maps.google.com/?q=Little+Italy+NY',
          openingHours: defaultOpeningHours,
          socialLinks: {
            instagram: 'https://instagram.com/bellaitalia_ny',
            website: 'https://bellaitalia.example.com',
          },
          coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
          logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80',
        },
      },
    },
  });

  const shop1Password = 'Bella@2025!';
  const shop1PasswordHash = await argon2.hash(shop1Password);
  await prisma.user.create({
    data: {
      loginId: 'bella_owner',
      passwordHash: shop1PasswordHash,
      role: Role.SHOP_OWNER,
      shopId: shop1.id,
      mustChangePassword: false,
      isActive: true,
    },
  });

  // Categories & Items for Shop 1
  const catStarters = await prisma.category.create({
    data: { shopId: shop1.id, name: 'Antipasti & Starters', sortOrder: 0, isVisible: true },
  });
  const catMains = await prisma.category.create({
    data: { shopId: shop1.id, name: 'Artisan Pastas', sortOrder: 1, isVisible: true },
  });
  const catPizza = await prisma.category.create({
    data: { shopId: shop1.id, name: 'Wood-Fired Pizza', sortOrder: 2, isVisible: true },
  });
  const catDesserts = await prisma.category.create({
    data: { shopId: shop1.id, name: 'Dolci (Desserts)', sortOrder: 3, isVisible: true },
  });

  await prisma.item.createMany({
    data: [
      {
        shopId: shop1.id,
        categoryId: catStarters.id,
        name: 'Tuscan Bruschetta',
        description: 'Toasted ciabatta rubbed with garlic, heirloom tomatoes, fresh basil, and aged Modena balsamic drizzle.',
        price: 12.50,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Vegetarian', 'Chef Special'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catStarters.id,
        name: 'Crispy Calamari Fritti',
        description: 'Lightly battered wild squid rings served with lemon-garlic aioli and spicy marinara.',
        price: 16.00,
        isVeg: false,
        spiceLevel: 1,
        tags: ['Seafood', 'Crispy'],
        isAvailable: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catStarters.id,
        name: 'Burrata Pugliese',
        description: 'Creamy burrata ball, prosciutto di Parma, roasted cherry tomatoes, and microgreens with grilled focaccia.',
        price: 18.00,
        isVeg: false,
        spiceLevel: 0,
        tags: ['Popular', 'Gluten Option'],
        isAvailable: true,
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=600&q=80',
      },
      // Mains
      {
        shopId: shop1.id,
        categoryId: catMains.id,
        name: 'Tagliolini al Tartufo',
        description: 'Fresh egg ribbon pasta tossed in cultured butter, shaved black summer truffles, and 24-month Parmigiano.',
        price: 28.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Truffle', 'Signature'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catMains.id,
        name: 'Penne all’Arrabbiata',
        description: 'San Marzano plum tomato sauce, bird’s eye chili, garlic confit, and fresh Italian parsley.',
        price: 19.50,
        isVeg: true,
        spiceLevel: 2,
        tags: ['Spicy', 'Vegan Option'],
        isAvailable: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catMains.id,
        name: 'Wild Mushroom Gnocchi',
        description: 'Pan-seared potato pillows, porcini broth, crispy sage leaves, and hazelnut crumble.',
        price: 24.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Seasonal'],
        isAvailable: false, // OUT OF STOCK
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
      },
      // Pizzas
      {
        shopId: shop1.id,
        categoryId: catPizza.id,
        name: 'Margherita D.O.P.',
        description: 'San Marzano tomatoes, fresh fior di latte mozzarella, basil leaves, extra virgin olive oil.',
        price: 18.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Classic', 'Bestseller'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catPizza.id,
        name: 'Diavola Piccante',
        description: 'Spicy Calabrian salami, house pickled jalapeños, smoked provolone, and hot chili honey.',
        price: 22.00,
        isVeg: false,
        spiceLevel: 2,
        tags: ['Spicy', 'House Favorite'],
        isAvailable: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catPizza.id,
        name: 'Quattro Formaggi Bianca',
        description: 'White base with gorgonzola dolce, fontina, aged parmigiano, and creamy ricotta with fresh rosemary.',
        price: 21.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Cheese Lovers'],
        isAvailable: false, // OUT OF STOCK
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
      },
      // Desserts
      {
        shopId: shop1.id,
        categoryId: catDesserts.id,
        name: 'Tiramisù Tradizionale',
        description: 'Savoiardi ladyfingers soaked in espresso and Marsala wine, layered with mascarpone cream and Valrhona cocoa.',
        price: 11.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Must Try'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catDesserts.id,
        name: 'Sicilian Cannoli (2 pcs)',
        description: 'Crisp pastry shells filled with sweetened ricotta, dark chocolate chips, and crushed Bronte pistachios.',
        price: 9.50,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Traditional'],
        isAvailable: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop1.id,
        categoryId: catDesserts.id,
        name: 'Panna Cotta ai Frutti di Bosco',
        description: 'Silky vanilla bean cream custard crowned with wild berries coulis and candied mint.',
        price: 10.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Gluten Free'],
        isAvailable: true,
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
      },
    ],
  });

  // Demo Shop 2: The Roasted Bean Cafe
  const shop2 = await prisma.shop.create({
    data: {
      name: 'The Roasted Bean Cafe',
      slug: 'roasted-bean',
      status: ShopStatus.ACTIVE,
      settings: {
        create: {
          brandColor: '#E05D38',
          templateKey: 'vibrant-cafe',
          currency: 'USD',
          phone: '+1 (555) 789-0123',
          whatsapp: '+15557890123',
          address: '102 Artisan Lane, Downtown Arts District, CA 90210',
          mapsUrl: 'https://maps.google.com/?q=Downtown+Arts+District',
          openingHours: defaultOpeningHours,
          socialLinks: {
            instagram: 'https://instagram.com/roastedbean_cafe',
            facebook: 'https://facebook.com/roastedbeancafe',
          },
          coverUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
          logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80',
        },
      },
    },
  });

  const shop2Password = 'Bean@2025!';
  const shop2PasswordHash = await argon2.hash(shop2Password);
  await prisma.user.create({
    data: {
      loginId: 'bean_owner',
      passwordHash: shop2PasswordHash,
      role: Role.SHOP_OWNER,
      shopId: shop2.id,
      mustChangePassword: false,
      isActive: true,
    },
  });

  // Categories & Items for Shop 2
  const catCoffee = await prisma.category.create({
    data: { shopId: shop2.id, name: 'Specialty Brews', sortOrder: 0, isVisible: true },
  });
  const catBakery = await prisma.category.create({
    data: { shopId: shop2.id, name: 'Artisan Pastries', sortOrder: 1, isVisible: true },
  });
  const catBreakfast = await prisma.category.create({
    data: { shopId: shop2.id, name: 'All-Day Brunch', sortOrder: 2, isVisible: true },
  });
  const catBeverages = await prisma.category.create({
    data: { shopId: shop2.id, name: 'Iced Refreshers', sortOrder: 3, isVisible: true },
  });

  await prisma.item.createMany({
    data: [
      {
        shopId: shop2.id,
        categoryId: catCoffee.id,
        name: 'Ethiopian Yirgacheffe Pour-Over',
        description: 'Single-origin light roast featuring floral jasmine notes, bergamot citrus, and honey sweetness.',
        price: 6.50,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Single Origin', 'Pour Over'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catCoffee.id,
        name: 'Oat Milk Flat White',
        description: 'Double ristretto espresso shots blended seamlessly with micro-foamed Minor Figures oat milk.',
        price: 5.75,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Vegan', 'Popular'],
        isAvailable: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catCoffee.id,
        name: 'Spanish Cinnamon Cortado',
        description: 'Equal parts espresso and warm condensed milk with a dusting of organic Ceylon cinnamon.',
        price: 5.25,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Sweet'],
        isAvailable: true,
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
      },
      // Bakery
      {
        shopId: shop2.id,
        categoryId: catBakery.id,
        name: 'Almond Frangipane Croissant',
        description: 'Twice-baked butter croissant loaded with rich almond cream, toasted sliced almonds, and powdered sugar.',
        price: 5.50,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Fresh Daily'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catBakery.id,
        name: 'Matcha White Chocolate Scone',
        description: 'Japanese ceremonial grade Uji matcha infused tender scone with Belgian white chocolate morsels.',
        price: 4.75,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Matcha'],
        isAvailable: false, // OUT OF STOCK
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catBakery.id,
        name: 'Cardamom Cinnamon Bun',
        description: 'Swedish twisted knot bun with freshly cracked green cardamom and sticky caramelized brown butter.',
        price: 5.00,
        isVeg: true,
        spiceLevel: 1,
        tags: ['Nordic Style'],
        isAvailable: true,
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80',
      },
      // Brunch
      {
        shopId: shop2.id,
        categoryId: catBreakfast.id,
        name: 'Avocado Tartine on Sourdough',
        description: 'Country sourdough, smashed Hass avocado, watermelon radish, pumpkin seeds, micro cilantro, and chili flakes.',
        price: 13.50,
        isVeg: true,
        spiceLevel: 1,
        tags: ['Vegetarian', 'Healthy'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catBreakfast.id,
        name: 'Smoked Salmon Brioche Benedict',
        description: 'Pasture-raised poached eggs, Scottish smoked salmon, and hollandaise sauce on toasted brioche.',
        price: 17.00,
        isVeg: false,
        spiceLevel: 0,
        tags: ['Signature Brunch'],
        isAvailable: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catBreakfast.id,
        name: 'Tropical Acai Bowl',
        description: 'Organic Amazonian acai blended with banana, topped with hemp granola, dragonfruit, coconut flakes, and chia.',
        price: 12.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Vegan', 'Superfood'],
        isAvailable: true,
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80',
      },
      // Refreshers
      {
        shopId: shop2.id,
        categoryId: catBeverages.id,
        name: 'Cold Brew Hibiscus Lemonade',
        description: 'Organic Egyptian hibiscus tea steeped cold, blended with Meyer lemon juice and mint leaves.',
        price: 6.00,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Refresher', 'Caffeine Free'],
        isAvailable: true,
        sortOrder: 0,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catBeverages.id,
        name: 'Sparkling Yuzu Espresso Tonic',
        description: 'Double espresso pulled directly over artisanal Japanese yuzu tonic water with ice and rosemary sprig.',
        price: 6.50,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Sparkling'],
        isAvailable: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
      },
      {
        shopId: shop2.id,
        categoryId: catBeverages.id,
        name: 'Dragonfruit Coconut Elixir',
        description: 'Fresh pink pitaya cold-pressed with young coconut water and a squeeze of Persian lime.',
        price: 6.75,
        isVeg: true,
        spiceLevel: 0,
        tags: ['Hydration'],
        isAvailable: false, // OUT OF STOCK
        sortOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
      },
    ],
  });

  // Add dummy initial QR scans for analytics verification
  const now = new Date();
  const scans = [];
  for (let i = 0; i < 15; i++) {
    const scannedAt = new Date(now.getTime() - Math.floor(Math.random() * 86400000 * 5));
    scans.push({ shopId: shop1.id, scannedAt, uaHash: 'demo-hash-1' });
  }
  for (let i = 0; i < 22; i++) {
    const scannedAt = new Date(now.getTime() - Math.floor(Math.random() * 86400000 * 12));
    scans.push({ shopId: shop2.id, scannedAt, uaHash: 'demo-hash-2' });
  }
  await prisma.qrScan.createMany({ data: scans });

  // Add initial audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: superAdmin.id,
        shopId: shop1.id,
        action: 'SHOP_CREATED',
        meta: { name: shop1.name, slug: shop1.slug },
      },
      {
        actorId: superAdmin.id,
        shopId: shop2.id,
        action: 'SHOP_CREATED',
        meta: { name: shop2.name, slug: shop2.slug },
      },
    ],
  });

  console.log('\n======================================================');
  console.log('🎉 DIGICATLOG SEED COMPLETED SUCCESSFULLY');
  console.log('======================================================');
  console.log('Super Admin Credentials:');
  console.log(`  Login ID:  ${superAdminLogin}`);
  console.log(`  Password:  ${superAdminPassword}`);
  console.log('\nDemo Shop 1:');
  console.log(`  Shop Name: ${shop1.name} (/m/${shop1.slug})`);
  console.log(`  Login ID:  bella_owner`);
  console.log(`  Password:  ${shop1Password}`);
  console.log('\nDemo Shop 2:');
  console.log(`  Shop Name: ${shop2.name} (/m/${shop2.slug})`);
  console.log(`  Login ID:  bean_owner`);
  console.log(`  Password:  ${shop2Password}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
