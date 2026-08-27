'use strict';

const { strict: assert } = require('assert');
const sinon = require('sinon');

// ── db mock ────────────────────────────────────────────────────────────────
const dbMock = {
  connect: sinon.stub(),
  queryRow: sinon.stub(),
  insert: sinon.stub(),
  update: sinon.stub(),
};

// Inject the mock before requiring auth so that auth's require('../db/db.js')
// returns our stub.
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '../db/db.js' || request.endsWith('/db/db.js')) {
    return dbMock;
  }
  return originalLoad.apply(this, arguments);
};

const auth = require('../src/auth/auth');

// Restore the original loader after the module has been required.
Module._load = originalLoad;

// ── helpers ───────────────────────────────────────────────────────────────
function resetStubs() {
  dbMock.connect.resetHistory();
  dbMock.connect.resetBehavior();
  dbMock.queryRow.resetHistory();
  dbMock.queryRow.resetBehavior();
  dbMock.insert.resetHistory();
  dbMock.insert.resetBehavior();
  dbMock.update.resetHistory();
  dbMock.update.resetBehavior();
}

// ── auth.init ──────────────────────────────────────────────────────────────
describe('auth.init', () => {
  afterEach(resetStubs);

  it('calls db.connect and logs on success', () => {
    dbMock.connect.callsFake((cb) => cb());
    auth.init();
    assert.ok(dbMock.connect.calledOnce);
  });

  it('calls db.connect without invoking the callback on failure', () => {
    dbMock.connect.callsFake(() => {}); // callback never invoked
    auth.init();
    assert.ok(dbMock.connect.calledOnce);
  });
});

// ── checkUser ─────────────────────────────────────────────────────────────
describe('auth.checkUser', () => {
  afterEach(resetStubs);

  it('returns the user row when credentials match', async () => {
    dbMock.queryRow.resolves([{ id: 1, level: 3 }]);
    const result = await auth.checkUser('admin', 'secret');
    assert.deepEqual(result, { id: 1, level: 3 });
  });

  it('returns null when no matching user is found', async () => {
    dbMock.queryRow.resolves([]);
    const result = await auth.checkUser('unknown', 'wrong');
    assert.equal(result, null);
  });

  it('returns false when the db rejects', async () => {
    dbMock.queryRow.rejects(new Error('db error'));
    const result = await auth.checkUser('admin', 'secret');
    assert.equal(result, false);
  });
});

// ── checkClient ───────────────────────────────────────────────────────────
describe('auth.checkClient', () => {
  afterEach(resetStubs);

  it('returns client row when nick is found', async () => {
    const client = { client_id: 10, user_id: 1, gmail: 'a@b.com', name: 'Alice' };
    dbMock.queryRow.resolves([client]);
    const result = await auth.checkClient('nick1');
    assert.deepEqual(result, client);
  });

  it('returns null when nick is not found', async () => {
    dbMock.queryRow.resolves([]);
    const result = await auth.checkClient('unknown');
    assert.equal(result, null);
  });

  it('returns null when db rejects', async () => {
    dbMock.queryRow.rejects(new Error('db error'));
    const result = await auth.checkClient('nick1');
    assert.equal(result, null);
  });
});

// ── checkDevice ───────────────────────────────────────────────────────────
describe('auth.checkDevice', () => {
  afterEach(resetStubs);

  it('returns device row when uid is found', async () => {
    const device = { id: 5, uid: 'proj-001', psk: 'key' };
    dbMock.queryRow.resolves([device]);
    const result = await auth.checkDevice('proj-001');
    assert.deepEqual(result, device);
  });

  it('returns null when device is not found', async () => {
    dbMock.queryRow.resolves([]);
    const result = await auth.checkDevice('proj-999');
    assert.equal(result, null);
  });

  it('returns null when db rejects', async () => {
    dbMock.queryRow.rejects(new Error('db error'));
    const result = await auth.checkDevice('proj-001');
    assert.equal(result, null);
  });
});

// ── addClient ─────────────────────────────────────────────────────────────
describe('auth.addClient', () => {
  afterEach(resetStubs);

  it('inserts a new client when client does not exist yet', async () => {
    // First call: getUser, second call: getClient (returns null)
    dbMock.queryRow
      .onFirstCall().resolves([{ id: 1, level: 3 }])   // getUser
      .onSecondCall().resolves([]);                      // getClient → null
    dbMock.insert.resolves({ insertId: 99 });

    await auth.addClient('newNick', 'admin', 'secret');

    assert.ok(dbMock.insert.calledOnce, 'insert should be called once');
    assert.ok(dbMock.update.notCalled, 'update should not be called');
  });

  it('updates the client when client already exists', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ id: 1, level: 3 }])           // getUser
      .onSecondCall().resolves([{ client_id: 10, user_id: 1 }]); // getClient → found
    dbMock.update.resolves({ affectedRows: 1 });

    await auth.addClient('existingNick', 'admin', 'secret');

    assert.ok(dbMock.update.calledOnce, 'update should be called once');
    assert.ok(dbMock.insert.notCalled, 'insert should not be called');
  });

  it('handles insert rejection gracefully', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ id: 1, level: 3 }])
      .onSecondCall().resolves([]);
    dbMock.insert.rejects(new Error('insert error'));

    await assert.doesNotReject(() => auth.addClient('newNick', 'admin', 'secret'));
  });

  it('handles update rejection gracefully', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ id: 1, level: 3 }])
      .onSecondCall().resolves([{ client_id: 10, user_id: 1 }]);
    dbMock.update.rejects(new Error('update error'));

    await assert.doesNotReject(() => auth.addClient('existingNick', 'admin', 'secret'));
  });
});

// ── checkPublishAuthorization ─────────────────────────────────────────────
describe('auth.checkPublishAuthorization', () => {
  afterEach(resetStubs);

  it('returns true for superuser (level 5)', async () => {
    dbMock.queryRow.resolves([{ level: 5 }]); // getUserLevel
    const result = await auth.checkPublishAuthorization('nick', 'root', 'pwd', 'proj/uid/data');
    assert.equal(result, true);
  });

  it('returns false when user level is missing', async () => {
    dbMock.queryRow.resolves([]); // getUserLevel → null
    const result = await auth.checkPublishAuthorization('nick', 'unknown', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('level 4 – returns true when client has access to project', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 4 }])                          // getUserLevel
      .onSecondCall().resolves([{ client_id: 10, user_id: 1 }])        // getClient
      .onThirdCall().resolves([{ id: 20, uidPrefix: 'p-', uidLength: 5 }]) // getProject
      .onCall(3).resolves([{ id: 1 }]);                                 // clientHasAccessToProject → true
    const result = await auth.checkPublishAuthorization('nick', 'manager', 'pwd', 'proj/uid/data');
    assert.equal(result, true);
  });

  it('level 4 – returns false when client has no access to project', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 4 }])
      .onSecondCall().resolves([{ client_id: 10, user_id: 1 }])
      .onThirdCall().resolves([{ id: 20, uidPrefix: 'p-', uidLength: 5 }])
      .onCall(3).resolves([]);                                          // clientHasAccessToProject → false
    const result = await auth.checkPublishAuthorization('nick', 'manager', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('level 4 – returns false when db throws', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 4 }])
      .onSecondCall().rejects(new Error('db error'));
    const result = await auth.checkPublishAuthorization('nick', 'manager', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('device user – returns true for valid device on matching project/uid', async () => {
    // topic: "proj/p-001/data"  uidPrefix='p-', uidLength=5
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 2 }])                           // getUserLevel
      .onSecondCall().resolves([{ id: 30, uidPrefix: 'p-', uidLength: 5 }]) // getProject
      .onThirdCall().resolves([{ id: 7, uid: 'p-001', psk: 'k' }]);    // getDevice
    const result = await auth.checkPublishAuthorization('p-001', 'device', 'psk', 'proj/p-001/data');
    assert.equal(result, true);
  });

  it('device user – returns false when device not found', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 2 }])
      .onSecondCall().resolves([{ id: 30, uidPrefix: 'p-', uidLength: 5 }])
      .onThirdCall().resolves([]);                                       // getDevice → null
    const result = await auth.checkPublishAuthorization('p-001', 'device', 'psk', 'proj/p-001/data');
    assert.equal(result, false);
  });

  it('device user – returns false when uid length does not match', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 2 }])
      .onSecondCall().resolves([{ id: 30, uidPrefix: 'p-', uidLength: 10 }]);
    const result = await auth.checkPublishAuthorization('p-001', 'device', 'psk', 'proj/p-001/data');
    assert.equal(result, false);
  });

  it('device user – returns false when project not found', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 2 }])
      .onSecondCall().resolves([]);                                      // getProject → null
    const result = await auth.checkPublishAuthorization('p-001', 'device', 'psk', 'proj/p-001/data');
    assert.equal(result, false);
  });

  it('client user – returns true when permission level > 1', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 1 }])                           // getUserLevel
      .onSecondCall().resolves([{ client_id: 10 }])                     // getClient
      .onThirdCall().resolves([{ level: 2 }]);                          // getPermission → level 2
    const result = await auth.checkPublishAuthorization('nick', 'client', 'pwd', 'proj/uid/data');
    assert.equal(result, true);
  });

  it('client user – returns false when permission level <= 1', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 1 }])
      .onSecondCall().resolves([{ client_id: 10 }])
      .onThirdCall().resolves([{ level: 1 }]);
    const result = await auth.checkPublishAuthorization('nick', 'client', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('client user – returns false when db throws', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 1 }])
      .onSecondCall().rejects(new Error('db error'));
    const result = await auth.checkPublishAuthorization('nick', 'client', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('unknown username – returns false', async () => {
    dbMock.queryRow.onFirstCall().resolves([{ level: 3 }]);
    const result = await auth.checkPublishAuthorization('nick', 'unknown', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });
});

// ── checkSubscribeAuthorization ───────────────────────────────────────────
describe('auth.checkSubscribeAuthorization', () => {
  afterEach(resetStubs);

  it('returns true for superuser (level 5)', async () => {
    dbMock.queryRow.resolves([{ level: 5 }]);
    const result = await auth.checkSubscribeAuthorization('nick', 'root', 'pwd', 'proj/uid/data');
    assert.equal(result, true);
  });

  it('returns false when user level is missing', async () => {
    dbMock.queryRow.resolves([]);
    const result = await auth.checkSubscribeAuthorization('nick', 'unknown', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('level 4 – returns true when client has access to project', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 4 }])
      .onSecondCall().resolves([{ client_id: 10, user_id: 1 }])
      .onThirdCall().resolves([{ id: 20, uidPrefix: 'p-', uidLength: 5 }])
      .onCall(3).resolves([{ id: 1 }]);
    const result = await auth.checkSubscribeAuthorization('nick', 'manager', 'pwd', 'proj/uid/data');
    assert.equal(result, true);
  });

  it('level 4 – returns false when db throws', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 4 }])
      .onSecondCall().rejects(new Error('db error'));
    const result = await auth.checkSubscribeAuthorization('nick', 'manager', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('device user – returns true for valid device on matching project/uid', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 2 }])
      .onSecondCall().resolves([{ id: 30, uidPrefix: 'p-', uidLength: 5 }])
      .onThirdCall().resolves([{ id: 7, uid: 'p-001', psk: 'k' }]);
    const result = await auth.checkSubscribeAuthorization('p-001', 'device', 'psk', 'proj/p-001/data');
    assert.equal(result, true);
  });

  it('device user – returns false when device not found', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 2 }])
      .onSecondCall().resolves([{ id: 30, uidPrefix: 'p-', uidLength: 5 }])
      .onThirdCall().resolves([]);
    const result = await auth.checkSubscribeAuthorization('p-001', 'device', 'psk', 'proj/p-001/data');
    assert.equal(result, false);
  });

  it('device user – returns false when uid prefix does not match', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 2 }])
      .onSecondCall().resolves([{ id: 30, uidPrefix: 'x-', uidLength: 5 }]);
    const result = await auth.checkSubscribeAuthorization('p-001', 'device', 'psk', 'proj/p-001/data');
    assert.equal(result, false);
  });

  it('client user – returns true when permission level > 0', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 1 }])
      .onSecondCall().resolves([{ client_id: 10 }])
      .onThirdCall().resolves([{ level: 1 }]);
    const result = await auth.checkSubscribeAuthorization('nick', 'client', 'pwd', 'proj/uid/data');
    assert.equal(result, true);
  });

  it('client user – returns false when permission is null', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 1 }])
      .onSecondCall().resolves([{ client_id: 10 }])
      .onThirdCall().resolves([]);                                       // getPermission returns null
    const result = await auth.checkSubscribeAuthorization('nick', 'client', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('client user – returns false when db throws', async () => {
    dbMock.queryRow
      .onFirstCall().resolves([{ level: 1 }])
      .onSecondCall().rejects(new Error('db error'));
    const result = await auth.checkSubscribeAuthorization('nick', 'client', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });

  it('unknown username – returns false', async () => {
    dbMock.queryRow.onFirstCall().resolves([{ level: 3 }]);
    const result = await auth.checkSubscribeAuthorization('nick', 'unknown', 'pwd', 'proj/uid/data');
    assert.equal(result, false);
  });
});
