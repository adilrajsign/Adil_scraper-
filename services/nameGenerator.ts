export const generateRandomUSAIdentity = (): string => {
  const firstNames = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
    "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua",
    "Kenneth", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan",
    "Jacob", "Gary", "Nicholas", "Eric", "Stephen", "Jonathan", "Larry", "Justin", "Scott", "Brandon",
    "Benjamin", "Samuel", "Gregory", "Frank", "Alexander", "Raymond", "Patrick", "Jack", "Dennis", "Jerry",
    "Tyler", "Aaron", "Jose", "Henry", "Douglas", "Peter", "Adam", "Nathan", "Zachary", "Walter", "Kyle",
    "Harold", "Carl", "Jeremy", "Keith", "Roger", "Gerald", "Christian", "Terry", "Sean", "Arthur", "Austin",
    "Noah", "Lawrence", "Jesse", "Joe", "Bryan", "Billy", "Jordan", "Albert", "Dylan", "Bruce", "Willie",
    "Gabriel", "Alan", "Juan", "Logan", "Wayne", "Ralph", "Roy", "Eugene", "Randy", "Vincent", "Russell",
    "Louis", "Philip", "Bobby", "Johnny", "Bradley", "Carlos", "Connor", "Jimmy", "Clarence", "Ethan", "Caleb",
    "Trevor", "Marcus", "Lucas", "Evan", "Cameron", "Cole", "Xavier", "Ian", "Tristan", "Aidan", "Hudson", "Miles",
    "Cooper", "Blake", "Nolan", "Parker", "Hunter", "Chase", "Sawyer", "Max", "Leo", "Julian", "Ezra", "Asher",
    "Liam", "Oliver", "Elijah", "Mason", "Jackson", "Sebastian", "Avery", "Wyatt", "Grayson", "Isaac", "Owen",
    "Carter", "Jayden", "Luke", "Lincoln", "Theo", "Levi", "Adrian", "Jeremiah", "Josiah", "Weston", "Easton",
    "Micah", "Kai", "Roman", "Axel", "Finn", "Declan", "Silas", "Beckett", "Emmett", "Ryder", "Brooks",
    "Harrison", "Calvin", "Victor", "Francis", "Leonard", "Norman", "Stanley", "Howard", "Frederick",
    "Martin", "Edwin", "Melvin", "Otis", "Sidney", "Wallace", "Wesley", "Alfred", "Bernard", "Clifford",
    "Elmer", "Floyd", "Gordon", "Irving", "Julius", "Leon", "Maurice", "Roland", "Theodore", "Vernon",
    "Wilbur", "Archie", "Dexter", "Ellis", "Franklin", "Harvey", "Ivan", "Jasper", "Kirk", "Lyle",
    "Marshall", "Neil", "Oscar", "Preston", "Quentin", "Reuben", "Spencer", "Travis", "Warren",
    "Xander", "Zane"
  ];

  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
    "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
    "Alason", "Alaton", "Alaman", "Alaley", "Alaford", "Alawin", "Alamark",
    "Alasen", "Alawood", "Alafield", "Alacrest", "Alawell", "Alahart",
    "Alastone", "Alabrook", "Alamere", "Alafall", "Alaridge", "Alamoor",
    "Aladell", "Alaworth", "Alalock", "Alahaven", "Alastead", "Aleson",
    "Aleton", "Aleman", "Aleley", "Aleford", "Alewin", "Alemark", "Alesen",
    "Alewood", "Alefield", "Alecrest", "Alewell", "Alehart", "Alestone",
    "Alebrook", "Alemere", "Alefall", "Aleridge", "Alemoor", "Aledell",
    "Aleworth", "Alelock", "Alehaven", "Alestead", "Alison", "Aliton",
    "Aliman", "Aliley", "Aliford", "Aliwin", "Alimark", "Alisen", "Aliwood",
    "Alifield", "Alicrest", "Aliwell", "Alihart", "Alistone", "Alibrook",
    "Alimere", "Alifall", "Aliridge", "Alimoor", "Alidell", "Aliworth",
    "Alilock", "Alihaven", "Alistead", "Aloson", "Aloton", "Aloman",
    "Aloley", "Aloford", "Alowin", "Alomark", "Alosen", "Alowood",
    "Alofield", "Alocrest", "Alowell", "Alohart", "Alostone", "Alobrook",
    "Alomere", "Alofall", "Aloridge", "Alomoor", "Alodell", "Aloworth",
    "Alolock", "Alohaven", "Alostead", "Aluson", "Aluton", "Aluman",
    "Aluley", "Aluford", "Aluwin", "Alumark", "Alusen", "Aluwood",
    "Alufield", "Alucrest", "Aluwell", "Aluhart", "Alustone", "Alubrook",
    "Alumere", "Alufall", "Aluridge", "Alumoor", "Aludell", "Aluworth",
    "Alulock", "Aluhaven", "Alustead"
  ];

  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const state = states[Math.floor(Math.random() * states.length)];

  return `${firstName} ${lastName} ${state}`;
};
