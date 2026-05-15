import { ObjectId } from 'mongodb';
import { getDb } from './db';

export type UserRole = 'admin' | 'user';

export interface JournalDocument {
  _id?: ObjectId;
  journalName: string;
  url: string;
  type: 'standard' | 'sciencedirect';
  order?: number;
  homeVisible?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthUserDocument {
  _id?: ObjectId;
  email: string;
  name: string;
  image?: string | null;
  provider?: string | null;
  role: UserRole;
  onboardingComplete: boolean;
  selectedJournals?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type JournalInput = Omit<JournalDocument, '_id' | 'createdAt' | 'updatedAt'>;

function sortJournalsByOrder(journals: JournalDocument[]): JournalDocument[] {
  return [...journals].sort((a, b) => {
    const aOrder = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const bOrder = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.journalName.localeCompare(b.journalName);
  });
}

function normalizeDisplayName(name?: string | null, email?: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const localPart = email?.split('@')[0]?.trim();
  return localPart || 'Reader';
}

export async function upsertAuthUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: string | null;
  role?: UserRole;
}): Promise<AuthUserDocument> {
  const db = await getDb();
  const users = db.collection<AuthUserDocument>('users');
  const now = new Date();
  const email = input.email.toLowerCase();
  const role: UserRole = input.role || 'user';

  const existing = await users.findOne({ email });
  if (existing) {
    const updated: AuthUserDocument = {
      ...existing,
      name: existing.name || normalizeDisplayName(input.name, input.email),
      image: input.image ?? existing.image ?? null,
      provider: input.provider ?? existing.provider ?? null,
      role: existing.role || role,
      onboardingComplete: existing.onboardingComplete ?? false,
      updatedAt: now,
    };

    await users.updateOne(
      { email },
      {
        $set: {
          name: updated.name,
          image: updated.image,
          provider: updated.provider,
          role: updated.role,
          onboardingComplete: updated.onboardingComplete,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: existing.createdAt || now,
        },
      }
    );

    return updated;
  }

  const created: AuthUserDocument = {
    email,
    name: normalizeDisplayName(input.name, input.email),
    image: input.image ?? null,
    provider: input.provider ?? null,
    role,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  };

  await users.insertOne(created);
  return created;
}

export async function getAuthUser(email: string): Promise<AuthUserDocument | null> {
  const db = await getDb();
  return db.collection<AuthUserDocument>('users').findOne({ email: email.toLowerCase() });
}

export async function getAuthUserById(userId: string): Promise<AuthUserDocument | null> {
  const db = await getDb();
  return db.collection<AuthUserDocument>('users').findOne({ _id: new ObjectId(userId) });
}

export async function updateAuthUserProfile(email: string, patch: { name?: string | null; selectedJournals?: string[]; onboardingComplete?: boolean; }): Promise<AuthUserDocument | null> {
  const db = await getDb();
  const users = db.collection<AuthUserDocument>('users');
  const now = new Date();

  const updateFields: any = { updatedAt: now };
  if (typeof patch.name !== 'undefined') updateFields.name = patch.name;
  if (typeof patch.selectedJournals !== 'undefined') updateFields.selectedJournals = patch.selectedJournals;
  if (typeof patch.onboardingComplete !== 'undefined') updateFields.onboardingComplete = patch.onboardingComplete;

  const result = await users.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  await users.updateOne({ email: email.toLowerCase() }, { $set: updateFields });
  const updated = await users.findOne({ email: email.toLowerCase() });
  return updated || null;
}

export async function updateAuthUserProfileById(userId: string, patch: { name?: string | null; selectedJournals?: string[]; onboardingComplete?: boolean; }): Promise<AuthUserDocument | null> {
  const db = await getDb();
  const users = db.collection<AuthUserDocument>('users');
  const now = new Date();

  const updateFields: any = { updatedAt: now };
  if (typeof patch.name !== 'undefined') updateFields.name = patch.name;
  if (typeof patch.selectedJournals !== 'undefined') updateFields.selectedJournals = patch.selectedJournals;
  if (typeof patch.onboardingComplete !== 'undefined') updateFields.onboardingComplete = patch.onboardingComplete;

  await users.updateOne({ _id: new ObjectId(userId) }, { $set: updateFields });
  return users.findOne({ _id: new ObjectId(userId) });
}

export async function listJournals(): Promise<JournalDocument[]> {
  const db = await getDb();
  const journals = await db.collection<JournalDocument>('journals').find({}).toArray();
  return sortJournalsByOrder(journals);
}

export async function listVisibleJournals(): Promise<JournalDocument[]> {
  const journals = await listJournals();
  return journals.filter(journal => journal.homeVisible !== false);
}

export async function seedJournalsIfEmpty(seedData: JournalInput[]): Promise<JournalDocument[]> {
  const db = await getDb();
  const journals = db.collection<JournalDocument>('journals');
  const count = await journals.countDocuments();

  if (count === 0 && seedData.length > 0) {
    const now = new Date();
    await journals.insertMany(
      seedData.map((journal, idx) => ({
        ...journal,
        order: idx + 1,
        homeVisible: true,
        createdAt: now,
        updatedAt: now,
      }))
    );
    return listJournals();
  }

  return listJournals();
}

export async function createJournal(input: JournalInput): Promise<JournalDocument> {
  const db = await getDb();
  const journals = db.collection<JournalDocument>('journals');
  const now = new Date();

  // determine next order value
  const count = await journals.countDocuments();
  const record: JournalDocument = {
    ...input,
    journalName: input.journalName.trim(),
    url: input.url.trim(),
    order: (typeof input.order === 'number' ? input.order : count + 1),
    homeVisible: typeof input.homeVisible === 'boolean' ? input.homeVisible : false,
    createdAt: now,
    updatedAt: now,
  };

  await journals.insertOne(record);
  return record;
}

export async function updateJournal(input: JournalInput): Promise<JournalDocument | null> {
  const db = await getDb();
  const journals = db.collection<JournalDocument>('journals');
  const now = new Date();

  const result = await journals.findOneAndUpdate(
    { journalName: input.journalName },
    {
      $set: {
        url: input.url.trim(),
        type: input.type,
        ...(typeof input.order === 'number' ? { order: input.order } : {}),
        ...(typeof input.homeVisible === 'boolean' ? { homeVisible: input.homeVisible } : {}),
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );

  return result;
}

export async function deleteJournal(journalName: string): Promise<boolean> {
  const db = await getDb();
  const journals = db.collection<JournalDocument>('journals');
  const result = await journals.deleteOne({ journalName });
  return result.deletedCount > 0;
}

// Article and vote models
export interface ArticleDocument {
  _id?: ObjectId;
  journalName: string;
  title: string;
  link?: string;
  description?: string;
  publicationDate: string; // store as string for consistency with RSS
  createdAt?: Date;
  updatedAt?: Date;
  voteCount?: number;
}

export interface VoteDocument {
  _id?: ObjectId;
  userId: ObjectId;
  userEmail?: string;
  articleId: ObjectId;
  createdAt?: Date;
}

export async function findOrCreateArticle(input: {
  journalName: string;
  title: string;
  link?: string;
  description?: string;
  publicationDate: string;
}): Promise<ArticleDocument> {
  const db = await getDb();
  const articles = db.collection<ArticleDocument>('articles');
  const now = new Date();

  const existing = await articles.findOne({ journalName: input.journalName, title: input.title, publicationDate: input.publicationDate });
  if (existing) return existing;

  const record: ArticleDocument = {
    journalName: input.journalName,
    title: input.title,
    link: input.link,
    description: input.description,
    publicationDate: input.publicationDate,
    createdAt: now,
    updatedAt: now,
    voteCount: 0,
  };

  const res = await articles.insertOne(record);
  record._id = res.insertedId;
  return record;
}

export async function toggleVote(userId: string, articleId: string, userEmail?: string): Promise<{ upvoted: boolean; votes: number }> {
  const db = await getDb();
  const votes = db.collection<VoteDocument>('votes');
  const articles = db.collection<ArticleDocument>('articles');
  const artObjectId = new ObjectId(articleId);
  const userObjectId = new ObjectId(userId);
  const normalizedEmail = userEmail?.toLowerCase();

  const existing = await votes.findOne({
    articleId: artObjectId,
    $or: [
      { userId: userObjectId },
      ...(normalizedEmail ? [{ userEmail: normalizedEmail }] : []),
    ],
  });
  if (existing) {
    await votes.deleteOne({ _id: existing._id });
    // decrement
    await articles.updateOne({ _id: artObjectId }, { $inc: { voteCount: -1 }, $set: { updatedAt: new Date() } });
    const a = await articles.findOne({ _id: artObjectId });
    return { upvoted: false, votes: a?.voteCount ?? 0 };
  }

  const now = new Date();
  await votes.insertOne({ userId: userObjectId, ...(normalizedEmail ? { userEmail: normalizedEmail } : {}), articleId: artObjectId, createdAt: now });
  await articles.updateOne({ _id: artObjectId }, { $inc: { voteCount: 1 }, $set: { updatedAt: now } });
  const a = await articles.findOne({ _id: artObjectId });
  return { upvoted: true, votes: a?.voteCount ?? 0 };
}

export async function getTopHighlighted(limit = 6): Promise<ArticleDocument[]> {
  const db = await getDb();
  const articles = db.collection<ArticleDocument>('articles');
  // Only surface articles that still have at least one vote.
  return articles.find({ voteCount: { $gt: 0 } }).sort({ voteCount: -1, publicationDate: -1 }).limit(limit).toArray();
}

export async function getUserVotesForArticleIds(userId: string, articleIds: string[], userEmail?: string): Promise<Set<string>> {
  const db = await getDb();
  const votes = db.collection<VoteDocument>('votes');
  const objectIds = articleIds.filter(Boolean).map(id => new ObjectId(id));
  if (objectIds.length === 0) return new Set();

  const normalizedEmail = userEmail?.toLowerCase();
  const items = await votes.find({
    articleId: { $in: objectIds },
    $or: [
      { userId: new ObjectId(userId) },
      ...(normalizedEmail ? [{ userEmail: normalizedEmail }] : []),
    ],
  }).toArray();
  return new Set(items.map(item => item.articleId.toString()));
}

export async function getUserUpvotedArticles(userId: string, limit = 20, userEmail?: string): Promise<Array<{ id: string; journalName: string; title: string; link?: string; publicationDate: string; upvotedAt?: Date }>> {
  const db = await getDb();
  const votes = db.collection<VoteDocument>('votes');
  const articles = db.collection<ArticleDocument>('articles');
  const normalizedEmail = userEmail?.toLowerCase();

  const items = await votes
    .find({
      $or: [
        { userId: new ObjectId(userId) },
        ...(normalizedEmail ? [{ userEmail: normalizedEmail }] : []),
      ],
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const articleIds = items.map(item => item.articleId);
  if (articleIds.length === 0) return [];

  const articleDocs = await articles.find({ _id: { $in: articleIds } }).toArray();
  const articleMap = new Map(articleDocs.map(article => [article._id?.toString() ?? '', article]));

  return items
    .map(item => {
      const article = articleMap.get(item.articleId.toString());
      if (!article || !article._id) return null;

      return {
        id: article._id.toString(),
        journalName: article.journalName,
        title: article.title,
        link: article.link,
        publicationDate: article.publicationDate,
        upvotedAt: item.createdAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function deleteAuthUser(email: string): Promise<boolean> {
  const user = await getAuthUser(email);
  if (!user?._id) return false;
  return deleteAuthUserById(user._id.toString(), user.email);
}

export async function deleteAuthUserById(userId: string, userEmail?: string): Promise<boolean> {
  const db = await getDb();
  const users = db.collection<AuthUserDocument>('users');
  const votes = db.collection<VoteDocument>('votes');
  const articles = db.collection<ArticleDocument>('articles');

  const userObjectId = new ObjectId(userId);
  const normalizedEmail = userEmail?.toLowerCase();

  // Find all votes by the user so we can decrement article counts
  const userVotes = await votes.find({
    $or: [
      { userId: userObjectId },
      ...(normalizedEmail ? [{ userEmail: normalizedEmail }] : []),
    ],
  }).toArray();
  const articleIds = userVotes.map(v => v.articleId).filter(Boolean);

  if (articleIds.length > 0) {
    // Decrement voteCount for each article referenced by the user's votes
    for (const aid of articleIds) {
      try {
        await articles.updateOne({ _id: aid }, { $inc: { voteCount: -1 }, $set: { updatedAt: new Date() } });
      } catch (e) {
        // ignore individual failures and continue
      }
    }
  }

  // Remove the user's votes
  await votes.deleteMany({
    $or: [
      { userId: userObjectId },
      ...(normalizedEmail ? [{ userEmail: normalizedEmail }] : []),
    ],
  });

  // Finally remove the user record
  const result = await users.deleteOne({ _id: userObjectId });
  return result.deletedCount > 0;
}
