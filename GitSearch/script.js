const searchResult = document.getElementById("searchResultCont");

const form = document.getElementById("form");

form.addEventListener("submit", searchData);

function searchData(e) {
  e.preventDefault();
  let userInput = this.querySelector("input");

  userInput.addEventListener("click", () => userInput.select());
  getData(userInput.value);
}

async function getData(userInput) {
  const baseUrl = `https://api.github.com/users/`;
  searchResult.innerHTML = ``;
  const fetchData = await fetch(baseUrl + userInput);
  const result = await fetchData.json();
  const fetchRepos = await fetch(baseUrl + userInput + `/repos?sort=created`);
  const reposJson = await fetchRepos.json();
  console.log(result);

  if (fetchData.ok) return createUserEl(result, reposJson);
  else ErrorData();
}

function ErrorData() {
  const errorObj = {
    avatar_url: "./assets/404.jpg",
    followers: `-------`,
    following: `-------`,
    bio: `404 Error - Bio not found`,
    login: `User Not Found`,
    public_repos: `-------`,
  };

  createUserEl(errorObj, []);
}

function createUserEl(userData, reposJson) {
  const gibhubCont = document.createElement("div");
  gibhubCont.classList.add("githubCont");

  // Github user cont
  const githubUserCont = document.createElement("div");
  githubUserCont.classList.add("githubUserCont");

  gibhubCont.appendChild(githubUserCont);

  // UserTop
  const userTop = document.createElement("div");
  userTop.classList.add("userTop");

  const imgCont = document.createElement("div");
  imgCont.classList.add("imgCont");
  userTop.appendChild(imgCont);
  const userProfile = document.createElement("img");
  userProfile.src = userData.avatar_url; 
  imgCont.appendChild(userProfile);
  githubUserCont.appendChild(userTop);

  const textCont = document.createElement("div");
  textCont.classList.add("textCont");
  userTop.appendChild(textCont);
 

  const username = document.createElement("div");
  username.classList.add("username");
  const userName = document.createElement("a");
  userName.innerHTML = userData.login; //
  userName.href = userData.html_url; //
  userName.target = `_blank`;
  username.appendChild(userName);
  textCont.appendChild(username);

  
  const bio_s = document.createElement("div");
  bio_s.classList.add("bio");
  const bio = document.createElement("p");
  bio.innerHTML = userData.bio; 
  bio_s.appendChild(bio);
  textCont.appendChild(bio_s);

  
  const repos_follow = document.createElement("div");
  repos_follow.classList.add("repos_follow");



  const repository = document.createElement("div");
  repository.classList.add("repos");
  const repoTitle = document.createElement("p");
  repoTitle.innerHTML = `Repositories`; //
  const repos = document.createElement("p");
  repos.innerHTML = userData.public_repos; //

  repository.appendChild(repoTitle);
  repository.appendChild(repos);
  repos_follow.appendChild(repository);

  
  const following_s = document.createElement("div");
  following_s.classList.add("following");
  const followingTitle = document.createElement("p");
  followingTitle.innerHTML = `Following`; //
  const following = document.createElement("p");
  following.innerHTML = userData.following; //

  following_s.appendChild(followingTitle);
  following_s.appendChild(following);
  repos_follow.appendChild(following_s);

  // Followers

  const follower_s = document.createElement("div");
  follower_s.classList.add("followers");
  const followersTitle = document.createElement("p");
  followersTitle.innerHTML = `Followers`; //
  const followers = document.createElement("p");
  followers.innerHTML = userData.followers; //

  follower_s.appendChild(followersTitle);
  follower_s.appendChild(followers);
  repos_follow.appendChild(follower_s);

  githubUserCont.appendChild(repos_follow);
  searchResult.appendChild(gibhubCont);

  const repoList = document.createElement("div");
  repoList.classList.add("repoLists");
  githubUserCont.appendChild(repoList);
  if (reposJson.length) {
    const Repositories = reposJson.slice(0, 5);
    Repositories.forEach((repo) => {
      const projectLinkEl = document.createElement("a");
      projectLinkEl.innerHTML = repo.name;
      projectLinkEl.href = repo.html_url;
      projectLinkEl.target = `_blank`;
      repoList.appendChild(projectLinkEl);
    });
  }
}