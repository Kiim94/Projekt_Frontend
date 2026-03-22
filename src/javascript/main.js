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

//upptäckt felaktig info i the Cat api. Gjort korrigeringar så det är "moderna" raser:
const correctOrigins={
    "LaPerm": "United States",
    "Abyssinian": "Ethiopia",
    "Somali": "United States",
    "Burmese": "Myanmar",
}

                                                                            /*=====KATTERNA=====*/
/**
 * Hämtar alla kattraser från the Cat Api och sparar dem i globala variabeln breedsData.
 * Uppdaterar med felmeddelande om anropet misslyckas.
 * 
 * @async
 * @returns {Promise<void>}
 */
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
/**
 * Filtrerar kattraser baserat på användarens sökning och visar resultatet i layouten.
 * Upp till 3 matchande raser med bild visas. Uppdaterar karta och landinformation.
 * Hanterar tom input och inga träffar.
 * 
 * Funktionen gör:
 * - Uppdaterar div "mashup" med renderade kort eller meddelanden
 * - Tar bort eventuell tidigare tillagd markör på karta
 * - Anropar funktionerna createCard, mapLocation och showCountryInfo
 * 
 * @param {string} filter - Användarens sökning 
 * @returns {void}
 */
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
        const imgUrl = "https://cdn2.thecatapi.com/images/" + breed.reference_image_id + ".jpg?size=small";
        createCard(breed, imgUrl);
    }

    //filtrera så man får med ursprungslandet.
    const first = filtered.find(land => land.origin);
    if (first) {

        //då ursprungsland kan ha blivit korrigerad så måste det göras för kartan med:
        //skapa variabel där korrigerade namn ELLER ursprungsland från APIt sparas.
        const correctedOrigin = correctOrigins[first.name] || first.origin;
        //skicka med första träffens ursprungsland till kartan
        mapLocation(correctedOrigin);
        //samma träff till landinfo-kortet
        showCountryInfo(correctedOrigin);
    }
}

/**
 * Skapar katt-kortet efter filtrerat innehåll från funktionen renderCat
 * 
 * Funktionen gör:
 * - Uppdaterar div "mashup" med ett nytt kort
 * @param {Object} breed - Objekt med information om kattrasen
 * @param {string} breed.name - Rasens namn
 * @param {string} breed.description - Kort beskrivning av rasen
 * @param {string} breed.origin - Ursprungsland från API
 * @param {string} breed.temperament - Rasens temperament
 * @param {string} breed.life_span - Förväntad livslängd
 * @param {string} imgUrl - URL för bild av rasen
 * @returns {void}
 */
function createCard(breed, imgUrl) {

    const origin = correctOrigins[breed.name] || breed.origin;
    mashup.innerHTML +=
        "<div class='breed-card'>" +
            "<h3>" + breed.name + "</h3>" +
            "<img src='" + imgUrl + "' alt='" + breed.name + "' class='breed-image' loading= 'lazy'>" +
            "<p><strong>Beskrivning: <br></strong>" + breed.description + "</p>" +
            "<p><strong>Ursprungsland: <br></strong>" + origin + "</p>" +
            "<p><strong>Temperament: <br></strong> " + breed.temperament + "</p>" +
            "<p><strong>Livslängd: <br></strong> " + breed.life_span + " år</p>" +
        "</div>";
}

                                                                         /* ===== Land-kortet =====*/

/**
 * Hämtar information om alla länder från REST Countries api. Sparas i globala variabeln countryData
 * Uppdaterar med felmeddelande om anropet misslyckas.
 * 
 * @async
 * @returns {Promise<void>}
 */
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

/**
 * Skapar land-kortet med information om kattens ursprungsland baserat på correctedOrigin (från renderCat).
 * Hittar landet från globala variabeln countryData:
 * - Visar flagga, namn, huvudstad, region och subregion.
 * 
 * Är en async-funktion för att kunna vänta in information för summering från "fetchWikiInfo"
 * Hämtar summering från Wikipedia via "fetchWikiInfo".
 * Om landet inte hittas visas ett meddelande.
 * 
 * Funktionen gör:
 * - Uppdaterar diven "countryInfo" med landets information
 * - Visar och justerar layout (sideBySide, mapDiv, map.invalidateSize)
 * 
 * @async
 * @param {string} correctedOrigin - Namnet på landet som ska visas
 * @returns {Promise<void>}
 */
async function showCountryInfo(correctedOrigin){
    const countryDiv = document.getElementById("countryInfo");
    countryDiv.innerHTML = "";

    //hitta första landet i countryData vars namn matchar med originCountry
    const country = countryData.find(c => 
        c.name.common.toLowerCase() === correctedOrigin.toLowerCase()
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

    const wikiText = await fetchWikiInfo(country.name.common);
        
    if (wikiText){
        countryDiv.innerHTML += "<p><strong>Summering: </strong><br>" + wikiText + "</p>";
    }

    countryDiv.classList.remove("hidden");

    sideBySide.classList.add("active");
    
    mapDiv.classList.remove("map-width");
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

/**
 * Hämtar summering från Wikipedias REST API om ett land.
 * 
 * "encodeURIComponent" på "countryName" för att vara säker på att specialtecken (å, ä, ö) inte bryter URL.
 * 
 * @async
 * @param {string} countryName - Namnet på landet som ska hämtas från Wikipedia
 * @returns {Promise<string>} - Summeringen av landet som text: tom sträng vid fel
 */
async function fetchWikiInfo(countryName){
    const url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(countryName);  
    try{
        const response = await fetch(url);
        const data = await response.json();
        return data.extract;
    } catch(error){
        console.error(error);
        return "";
    }
}

                                                                           /*=====KARTAN=====*/

//skapa kartan
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    minZoom:2,
    maxZoom:5,
    updateWhenIdle:true,
    noWrap:true
}).addTo(map);

/**
 * Hittar koordinater för ett land via OpenStreetMap Nominatim API och lägger till ikon på kartan.
 * 
 * Funktionen gör:
 * - Skapar markör med ikon 🐈‍⬛ på platsens koordinater.
 * - Tar bort eventuell tidigare markör (map.removeLayer(window.currentMarker))
 * - Flyttar kartan till rätt plats med "map.flyTo"
 * - Binder popup med platsens namn för extra tydlighet
 * 
 * @async
 * @param {string} correctedOrigin - Namnet på landet eller platsen som ska visas på kartan.
 * @returns {Promise<void>} - All output sker via kartan så ingen output.
 */
async function mapLocation(correctedOrigin){
    try{
        const response = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + 
            encodeURIComponent(correctedOrigin)
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