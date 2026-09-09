const { collections } = require("../config/db");

async function createOrUpdateUser({ authUserId, name, email, image }) {
  const usersCollection = collections.users();
  const existing = await usersCollection.findOne({ authUserId });

  if (existing) {
    await usersCollection.updateOne(
      { authUserId },
      { $set: { name, email, image, updatedAt: new Date() } }
    );
    return await usersCollection.findOne({ authUserId });
  }

  const newUser = {
    authUserId,
    name,
    email,
    image: image || "",
    role: "SEEKER", // default role — user can be changed to RECRUITER during onboarding, or by admin
    status: "active",
    profile: {
      headline: "",
      bio: "",
      location: "",
      phone: "",
      skills: [],
      education: [],
      experience: [],
      portfolioUrl: "",
      github: "",
      linkedin: "",
      resumeUrl: "",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await usersCollection.insertOne(newUser);
  return { ...newUser, _id: result.insertedId };
}

module.exports = { createOrUpdateUser };