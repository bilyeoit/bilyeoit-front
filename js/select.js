const locationBtn = document.getElementById("locationBtn");
const locationDropdown = document.getElementById("locationDropdown");
const locationList = document.getElementById("locationList");
const locationText = document.getElementById("locationText");
const locationPath = document.getElementById("locationPath");

let step = 0; // 0: 시/도, 1: 군/구, 2: 동
let selected = {
  city: "",
  district: "",
  dong: ""
};

const locationData = {
  "경기도": {
    "김포시": ["장기동", "운양동", "풍무동", "사우동"],
    "고양시": ["백석동", "주엽동", "탄현동", "화정동"]
  },
  "서울특별시": {
    "강남구": ["역삼동", "논현동", "청담동", "삼성동"],
    "마포구": ["합정동", "상수동", "서교동", "연남동"]
  },
  "인천광역시": {
    "연수구": ["송도동", "연수동", "옥련동"],
    "부평구": ["부평동", "산곡동", "청천동"]
  }
};

locationBtn.addEventListener("click", function(e){
  e.stopPropagation();
  locationDropdown.classList.toggle("active");
  renderLocationList();
});

document.addEventListener("click", function(e){
  if(!e.target.closest(".location-field")){
    locationDropdown.classList.remove("active");
  }
});

function renderLocationList(){
  locationList.innerHTML = "";

  if(step === 0){
    locationPath.textContent = "시/도를 선택해주세요";

    Object.keys(locationData).forEach(function(city){
      createLocationItem(city, function(){
        selected.city = city;
        selected.district = "";
        selected.dong = "";
        step = 1;
        renderLocationList();
      });
    });
  }

  else if(step === 1){
    locationPath.textContent = selected.city;

    createBackItem("← 시/도 다시 선택", function(){
      step = 0;
      renderLocationList();
    });

    Object.keys(locationData[selected.city]).forEach(function(district){
      createLocationItem(district, function(){
        selected.district = district;
        selected.dong = "";
        step = 2;
        renderLocationList();
      });
    });
  }

  else if(step === 2){
    locationPath.textContent = selected.city + " > " + selected.district;

    createBackItem("← 군/구 다시 선택", function(){
      step = 1;
      renderLocationList();
    });

    locationData[selected.city][selected.district].forEach(function(dong){
      createLocationItem(dong, function(){
        selected.dong = dong;

        // 버튼에는 군/구 > 동 만 표시
        locationText.textContent = selected.district + " > " + selected.dong;

        locationDropdown.classList.remove("active");
        step = 0;
      });
    });
  }
}

function createLocationItem(name, onClick){
  const li = document.createElement("li");
  li.textContent = name;
  li.addEventListener("click", function(e){
    e.stopPropagation();
    onClick();
  });
  locationList.appendChild(li);
}

function createBackItem(name, onClick){
  const li = document.createElement("li");
  li.textContent = name;
  li.classList.add("is-back");
  li.addEventListener("click", function(e){
    e.stopPropagation();
    onClick();
  });
  locationList.appendChild(li);
}