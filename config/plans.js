const PLANS = {
  seeker: {
    free: { name: "Free", price: 0, limits: { applicationsPerMonth: 3, savedJobs: 10 } },
    pro: { name: "Pro", price: 19, limits: { applicationsPerMonth: 30, savedJobs: Infinity } },
    premium: { name: "Premium", price: 39, limits: { applicationsPerMonth: Infinity, savedJobs: Infinity } },
  },
  recruiter: {
    free: { name: "Free", price: 0, limits: { activeJobs: 3 } },
    growth: { name: "Growth", price: 49, limits: { activeJobs: 10 } },
    enterprise: { name: "Enterprise", price: 149, limits: { activeJobs: 50 } },
  },
};

module.exports = { PLANS };