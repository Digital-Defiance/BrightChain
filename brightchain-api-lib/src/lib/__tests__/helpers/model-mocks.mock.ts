// brightchain-api-lib/src/lib/__tests__/helpers/model-mocks.ts
export function makeUserModel(userDoc: unknown | null) {
  const resolveDoc = async () => userDoc as unknown;
  const finalChain = {
    session: resolveDoc,
    exec: resolveDoc,
  };
  const withLean = {
    lean: () => finalChain,
  };
  const withSelect = {
    select: () => withLean,
  };
  const base = {
    select: () => withLean,
    collation: () => withSelect,
    session: () => finalChain,
  };
  return {
    findOne: () => base,
  };
}

export function makeUserRoleModel(userRoleDocs: unknown[] | null) {
  const docs = userRoleDocs || [];

  const query = {
    populate: function () {
      return this;
    },
    select: function () {
      return this;
    },
    lean: function () {
      return this;
    },
    session: async () => docs,
  };

  return {
    find: () => query,
  };
}

export function makeRoleModel(roleDoc: unknown | null) {
  const docs = roleDoc ? [roleDoc] : [];

  const findQuery = {
    select: function () {
      return this;
    },
    lean: function () {
      return this;
    },
    session: async () => docs,
  };

  const findOneQuery = {
    lean: () => ({
      exec: async () => roleDoc,
    }),
  };

  return {
    find: () => findQuery,
    findOne: () => findOneQuery,
  };
}
