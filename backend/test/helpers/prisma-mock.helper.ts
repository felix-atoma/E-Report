/**
 * Creates a deep jest mock of PrismaService for unit tests.
 * Each model method (findMany, findFirst, create, update, …) is a jest.fn().
 */
export function createPrismaMock() {
  const mockFn = () => jest.fn();

  const modelMock = () => ({
    findMany: mockFn(),
    findFirst: mockFn(),
    findUnique: mockFn(),
    create: mockFn(),
    createMany: mockFn(),
    update: mockFn(),
    updateMany: mockFn(),
    upsert: mockFn(),
    delete: mockFn(),
    deleteMany: mockFn(),
    count: mockFn(),
  });

  return {
    user: modelMock(),
    institution: modelMock(),
    class: modelMock(),
    classStudent: modelMock(),
    classSubject: modelMock(),
    subject: modelMock(),
    student: modelMock(),
    reportCard: modelMock(),
    grade: modelMock(),
    fee: modelMock(),
    studentFee: modelMock(),
    payment: modelMock(),
    notificationLog: modelMock(),
    subscriptionPayment: modelMock(),
    gradeFiche: modelMock(),
    bulletin: modelMock(),
    brandingAsset: modelMock(),
    refreshToken: modelMock(),
    passwordResetToken: modelMock(),
    auditLog: modelMock(),
    $transaction: jest.fn((ops: any) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;
