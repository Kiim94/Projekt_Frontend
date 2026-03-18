import '../css/style.scss';

document.addEventListener("DOMContentLoaded", () => {
    getBreeds();
    getCountryInfo();
});
//hämta alla element från HTML som ska användas
const mashup = document.getElementById("mashup");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("srcBtn");
const mapDiv = document.getElementById("map");
const sideBySide = document.querySelector(".sidebyside");

//lägg till denna så kartan tar upp mer plats i början
mapDiv.classList.add("map-width");

//ha "tomma" arrayer till att börja med.
let breedsData = [];
let countryData = [];



                                                                            /*=====KATTERNA=====*/
// Hämta alla raser vid start
async function getBreeds() {
    try {
        const resp = await fetch("https://api.thecatapi.com/v1/breeds")
        breedsData = await resp.json();
    } catch (error) {
        console.error(error);
        mashup.innerHTML = "<p>Det gick inte att hämta kattraser.</p>";
    }
}

// Skapa kort/ta fram info för kort. Filtrera fram ras.
function renderCat(filter) {
    mashup.innerHTML = "";

    //om input är tomt, visa meddelande
    if(!filter){
        mashup.innerHTML ="<p style='text-align:center'>Fyll i en kattras att söka efter 🐱</p>";
        if(window.currentMarker) map.removeLayer(window.currentMarker);
        return;
    }

    //filtrera på kattras-namnet. Gör alla bokstäver till lowerCase. Hämta alla kattraser som matchar
    const filtered = breedsData.filter(breed =>
        breed.name.toLowerCase().includes(filter.toLowerCase())
    );

    //om ingent resultat, visa text ta bort eventuell gammal markör på karta.
    if (filtered.length === 0) {
        mashup.innerHTML = "<p>Tyvärr matchade ingen katt.</p>";

        if(window.currentMarker) map.removeLayer(window.currentMarker);
        return;
    }
    //loopa igenom resultat för att få fram bilder. Kattras + bild skickas till funktionen createCard
    for (let i = 0; i < 3 && i < filtered.length; i++) {
        const breed = filtered[i];
        if (!breed.reference_image_id){
            continue;
        }
        const imgUrl = "https://cdn2.thecatapi.com/images/" + breed.reference_image_id + ".jpg";
        createCard(breed, imgUrl);
    }

    //filtrera så man får med ursprungslandet.
    const first = filtered.find(land => land.origin);
    if (first) {

        //skicka med första träffens ursprungsland till funktionerna nedan
        mapLocation(first.origin);
        showCountryInfo(first.origin);
    }
}

// Visa kattrasen på ett kort
function createCard(breed, imgUrl) {
    mashup.innerHTML +=
        "<div class='breed-card'>" +
            "<h3>" + breed.name + "</h3>" +
            "<img src='" + imgUrl + "' alt='" + breed.name + "' class='breed-image'>" +
            "<p><strong>Beskrivning: <br></strong>" + breed.description + "</p>" +
            "<p><strong>Ursprungsland: <br></strong>" + breed.origin + "</p>" +
            "<p><strong>Temperament: <br></strong> " + breed.temperament + "</p>" +
            "<p><strong>Livslängd: <br></strong> " + breed.life_span + " år</p>" +
        "</div>";
}

                                                                        /* ===== Land-kortet =====*/

//async för att hämta information om länder från restcountries.com
async function getCountryInfo(){
    try{
        const response = await fetch(
            "https://restcountries.com/v3.1/all?fields=name,flags,latlng,capital,region,subregion"
        )
        countryData = await response.json()
    } catch(error){
        console.error("Det gick inte att hämta landet: ", error);
    }
}

//function baserad på getCountryInfo. (originCountry) kommer från renderCat, syftar på ursprungslandet
async function showCountryInfo(originCountry){
    const countryDiv = document.getElementById("countryInfo");
    countryDiv.innerHTML = "";

    //hitta första landet i countryData vars namn matchar med originCountry
    const country = countryData.find(c => 
        c.name.common.toLowerCase() === originCountry.toLowerCase()
    );
    if (!country){
        countryDiv.innerHTML = "<p>Information om landet finns ej</p>";
        return;
    }

    let capitalName = "Okänt";
    if(country.capital && country.capital.length > 0){
        capitalName = country.capital[0];
    };

    countryDiv.innerHTML =
    "<img src='" + country.flags.svg + "' alt='Flagga " + country.name.common + "' class='country-flag'>" +
    "<h3>Land: " + country.name.common + "</h3>" +
    "<p><strong>Huvudstad:</strong> " + capitalName + "</p>"+
    "<p><strong>Region:</strong> " + (country.region || "Okänt") + "</p>"+
    "<p><strong>Subregion:</strong> " + (country.subregion || "Okänt") + "</p>";

    mapDiv.classList.remove("map-width");
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}



                                                                           /*=====KARTAN=====*/

//skapa kartan
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


//hitta var kattras har sitt ursprungsland. Lägg till ikon på kartan
async function mapLocation(search){
    try{
        const response = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + 
            encodeURIComponent(search)
    );

        const data = await response.json();

        //utifrån response från json, få fram koordinaterna.
        if(data.length > 0){
            const lat = data[0].lat;
            const lon = data[0].lon;   
            
            //skapa markör
            let icon = L.divIcon({
                className: 'icon',
                html: '🐈‍⬛',
                iconSize: [24, 24],
                iconAnchor:[12,35],
                popupAnchor:[0, -24]
            });
                
            //ta bort markör
            if(window.currentMarker){
                map.removeLayer(window.currentMarker);
            }

            window.currentMarker =
            L.marker([lat, lon], {
                icon: icon
            }).addTo(map)
            .bindPopup(data[0].display_name)
            .openPopup();
            
            map.flyTo([lat,lon], 3.8);
        }
    }catch(err){
        console.error("Något gick fel: ", err);
    }
}

// Sökfunktion, både enter och knapp
searchBtn.addEventListener("click", () => {
    renderCat(searchInput.value.trim());
});

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") 
        renderCat(searchInput.value.trim());
});