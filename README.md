# Ogrodje za igre pri RGTI

## Podrobnosti glede ogrodja

### Vhodni podatki

Ogrodje privzeto podpira datoteke formata [glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html). Razčlenjevalnik formata je preprost, zato ne podpira vseh funkcionalnosti, omogoča pa prebiranje:
* mrežnih predmetov (_meshes_),
* materialov z eno teksturo razpršitve (_diffuse texture_),
* animacij transformacij,
* osnovne okostitve (_skinning_),
* kamer.

Podatki oglišč, ki se naložijo, so:
* položaji,
* prve teksturne koordinate (`TEXCOORD_0`),
* normale,
* tangente,
* uteži za kosti (`WEIGHTS_0` in `JOINTS_0`).

Razčlenjevalnik predpostavlja, da ima vsak predmet točno en material!

### Struktura

Arhitektura ogrodja se zgleduje po [ECS (Entity-Component-System)](https://en.wikipedia.org/wiki/Entity_component_system). 3D prizor sestavljajo entitete. Posamezno entiteto določajo komponente, ki entiteti dajejo posamezne lastnosti. Entitete in komponente so primerki razredov. Sistemi, ki so oblikovani kot funkcije, obdelujejo sceno, posodabljo podatke in stanje igre ter upodabljajo prizor na platno.

Vsa koda je v imeniku `src`:
* Imenik `components` hrani razrede komponent. Vsaka komponenta implementira vmesnik `Component` (iz datoteke `Component.ts`).
* Imenik `data` hrani podatkovne razrede, ki niso komponente (npr. materiali).
* Imenik `parsers` hrani razčlenjevalnik glTF.
* Imenik `renderers` hrani upodabljalnike: strukture, ki določajo, kako se posamezne entitete upodabljajo.
* Imenik `shaders` hrani senčilniške programe (datoteke s končnico .wgsl).
* Imenik `systems` hrani sisteme (npr. transformacijski, animacijski, upodabljalni ...).
* V korenskem imeniku so še ostali nekategorizirani razredi in funkcije.

### Upodabljanje

**Medpomnilniki** za grafično kartico bivajo v komponentah, kjer je to smiselno (npr. Camera, Transform, Mesh) ter se nalagajo in posodabljajo v ločenih sistemih (`systems/BufferInitSystem.ts` in `systems/BufferUpdateSystem.ts`).

**Upodabljanje** poteka prek sistema `systems/RenderSystem.ts`. Vse podatke v zvezi z upodabljanjem hrani `RenderState.ts`: GPU napravo, kontekst in teksturo platna, globinske in druge teksture, vzorčevalnik tekstur ter upodabljalnike. Slednji so implementirani v imeniku `renderers`, praviloma pa hranijo upodabljalni cevovod (_pipeline_) in skupine vezav (_bind groups_).

Število skupin vezav je omejeno (privzeta meja je 4), zato je ogrodje prilagojeno tej omejitvi. Podatke zato razdelimo po skupinah glede na štiri sklope.
1. sklop: podatki na nivoju okvirja/slike. Na to skupino vezav vežemo podatke, ki se ne posodabljajo več kot enkrat na iteracijo upodabljanja. Sem sodijo na primer podatki o kameri in lučeh.
2. sklop: podatki na nivoju entitete. Te nastavimo za vsako entiteto. V našem primeru je lahko to matrika modela.
3. sklop: podatki na nivoju materialov. Tipično imajo lahko predmeti tudi več materialov (posamezni trikotniki imajo dodeljen svoj material), vendar to v našem ogrodju ni podprto. Kljub temu ohranjamo to razločitev, zato v tej skupini shranjujemo teksture in druge uniforme materialov.
4. sklop: podatki okostitve.


## FAQ
1. **JavaScript, TypeScript, zakaj se moram *spet* učiti nov programski jezik?** Na kratko, temu se pri predmetu o računalniški grafiki res težko izognemo. Sodobne namizne aplikacije, ki uporabljajo grafične vmesnike, kot so Vulkan, DirectX in Metal, so običajno napisane v C++ ali Rustu. Na srečo pa obstaja moderna alternativa, ki omogoča razvoj grafičnih aplikacij v brskalniku, in sicer WebGPU, ki je ne le preprostejša za začetnike, temveč tudi omogoča razvoj v programskih jezikih JavaScript in TypeScript, ki sta prav tako precej bolj dostopna.
2. **Kaj je razlika med JavaScriptom in TypeScriptom, zakaj zvenita tako podobno?** JavaScript je programski jezik, ki ga brskalniki razumejo in izvajajo. Ta odločitev je padla ob koncu 20. stoletja in od takrat mora svet živeti z njo. Kljub imenu nima nobene povezave z Javo, v mnogih pogledih je celo bolj podoben Pythonu. TypeScript je nadgradnja JavaScripta, ki omogoča uporabo tipov in s tem preprečuje številne napake, ob katere bi se spotaknili šele med izvajanjem (odpravljanje takih napak je v brskalniku za začetnike še posebej nerodno). Dandanes je TypeScript praktično industrijski standard za razvoj spletnih aplikacij, zato res ni razloga, da bi se ga otepali. Ker pa brskalniki ne razumejo TypeScripta, moramo kodo v TypeScriptu najprej prevesti v JavaScript, podobno kot je treba prevesti kodo v Javi ali C++ v strojno kodo, da jo lahko računalnik razume in izvede. Na srečo je dandanes prevajanje TypeScripta v JavaScript precej enostavno in smo ga za vaše potrebe popolnoma avtomatizirali.

## Čtivo (preskoči na lastno odgovornost)
### Obvezno branje za tiste, ki se prvič srečujete s JavaScriptom oz. TypeScriptom:
#### TypeScript za poznavalca Jave: [https://comp426-25s.github.io/readings/r02-TypeScript-for-Java-Developer](https://comp426-25s.github.io/readings/r02-TypeScript-for-Java-Developer)
#### Asinhronost: [https://web.mit.edu/6.102/www/sp24/classes/15-promises/](https://web.mit.edu/6.102/www/sp24/classes/15-promises/)

### Za tiste, ki ste že precej domači z JavaScriptom:
#### Kratek povzetek sintakse TypeScripta: [https://learnxinyminutes.com/typescript/](https://learnxinyminutes.com/typescript/)
#### Uradni TypeScript priročnik: [https://www.typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html)
#### Asinhronost: [https://web.mit.edu/6.102/www/sp24/classes/15-promises/](https://web.mit.edu/6.102/www/sp24/classes/15-promises/)

### Nekaj uporabnih povezav:
#### TypeScript dokumentacija: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)
#### Kratek povzetek sintakse JavaScripta (in mnogih mogočih grdobij v tem jeziku): [https://learnxinyminutes.com/javascript/](https://learnxinyminutes.com/javascript/)
#### Pogljobljena asinhronost v JavaScriptu (velja tudi za TypeScript): [https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS)



## Opis predloge
Predloga vsebuje:
- osnovno strukturo TypeScript projekta, ki vključuje datoteko `package.json`, v kateri so definirane odvisnosti in skripte za prevajanje in zagon programa, ter imenik `src`, v katerem se nahajajo vse datoteke z izvorno kodo,
- HTML datoteko `index.html`, ki vsebuje element `<canvas>`, na katerega bomo risali, in
- datoteko `main.ts`, ki je vstopna točka programa.

## Pisanje kode
Vsa koda, ki jo boste pisali v TypeScriptu, se mora nahajati v imeniku `src`, saj je drugače prevajalnik ne bo našel. Imenik, kjer prevajalnik išče datoteke, lahko spremenimo v datoteki `tsconfig.json` (`compilerOptions -> rootDir`). Koda mora biti vkjučena v korenski datoteki `index.html` preko značke `<script>`, ki mora vsebovati pot do prevedene JavaScript datoteke, ki se nahaja v imeniku `dist` (spočetka le-tega v repozitoriju ne boste videli, saj ga prevajalnik ustvari ob prvem prevajanju kode). V primeru, da bi želeli spremeniti imenik, kamor se shranjuje prevedena koda, to lahko storite v datoteki `tsconfig.json` (`compilerOptions -> outDir`).


## Postavitev okolja

### 1. Namestitev Node.js
Za delo s TypeScriptom moramo namestiti [Node.js](https://nodejs.org/).

Uspešnost namestitve preverimo tako, da v terminalu izpišemo verzijo Node.js in npm (Node Package Manager) z ukazoma:

```bash
node -v
npm -v
```

Izpisati bi se moralo nekaj podobnega spodnjemu izpisu:
```console
> node -v
v24.16.0
> npm -v
11.16.0
```

### 2. Namestitev knjižnic
Podobno kot Python tudi TypeScript uporablja knjižnice (angl. *packages*), ki jih namestimo preko npm. Za namestitev knjižnic se v terminalu premaknemo v imenik projekta in izvedemo ukaz:

```bash
npm install
```

Ta ukaz prebere datoteko `package.json` in namesti vse knjižnice, ki so v njej navedene. Za delo pri predmetu načeloma ne boste potrebovali drugih knjižnic.

Opazili boste, da se je v korenskem imeniku pojavil nov imenik `node_modules`, v katerem so nameščene vse knjižnice. Ta imenik lahko odslej ignorirate.

### 3. Zagon strežnika
Za zagon strežnika, ki skrbi za osveževanje strani ob spremembah v kodi, se v terminalu premaknemo v imenik projekta in izvedemo ukaz:

```bash
npm run dev
```

Do strežnika dostopamo preko povezave: [http://localhost:3000/](http://localhost:3000/). Če želimo strežnik ustaviti, to storimo v terminalu s kombinacijo tipk `Ctrl + C`.

`npm run dev` je ukaz, definiran v datoteki `package.json`. Sestavljen je iz dveh delov, ki se izvajata vzporedno:
- `tsc --watch`, ki skrbi za prevajanje TypeScript kode v JavaScript kodo vsakič, ko se spremeni katera od datotek v imeniku `src` (natančneje v imeniku, ki je naveden pod `compilerOptions -> rootDir` v datoteki `tsconfig.json`).
- `serve -l 3000 .`, ki zažene strežnik v korenskem imeniku na naslovu localhost in vratih 3000.

#### Zakaj je treba prevajati TypeScript kodo v JavaScript kodo?
TypeScript je nadgradnja JavaScripta, ki omogoča uporabo tipov in drugih funkcionalnosti, ki jih JavaScript ne podpira. Brskalniki ne razumejo TypeScript kode, zato je treba kodo najprej prevesti v JavaScript, ki ga brskalniki lahko interpretirajo. Če natančno pregledate vsebino projekta, boste opazili, da se je ob zagonu ukaza `npm run dev` pojavil nov imenik `dist`, ki vsebuje prevedeno JavaScript kodo. V tem imeniku so datoteke, ki jih brskalnik dejansko naloži in interpretira. V `index.html` lahko prav tako opazite, da se v znački `<script>` nahaja povezava do datoteke `dist/main.js` in ne do datoteke `src/main.ts`.

Prevajanje bi načeloma morali izvajati ročno, vendar je v tem primeru avtomatizirano z uporabo zastavice `--watch`, ki spremlja spremembe v datotekah in ob vsaki spremembi ponovno prevede kodo. Ta zastavica je že vgrajena v ukaz `npm run dev`. Če pa želite kodo le prevesti brez zaganjanja strežnika, lahko to storite z ukazom `npm run build`.

#### Zakaj je treba zagnati strežnik?
Brskalniki imajo varnostne omejitve, ki preprečujejo nalaganje datotek iz lokalnega datotečnega sistema. To nam povzroča težave, ko želimo med izvajanjem programa brati dodatne datoteke z diska, kot so slike, teksture ali 3D modeli. Zagon strežnika pa omogoča, da brskalnik te datoteke naloži prek protokola HTTP, kot bi to počel pri prenašanju vsebin z oddaljenih strežnikov.

### Razhroščevanje z Visual Studio Code
Za lažje delo s TypeScriptom priporočamo uporabo urejevalnika Visual Studio Code, saj je razhroščevanje kode, ki se poganja v brskalniku, sicer nekoliko nerodno. Visual Studio Code ima že vgrajeno funkcionalnost razhroščevanja TypeScript kode, vključno s podporo za zaustavitvene točke (angl. *breakpoints*) v brskalniku. Za lažje delo smo vam že pripravili konfiguracijo razhroščevanja, ki se nahaja v `.vscode/launch.json`, uporabite pa jo takole:

1. Prepričajte se, da imate na sistemu nameščen brskalnik iz družine Chromium, torej bodisi Google Chrome bodisi Brave, Vivaldi, Chromium itd.
    - Če uporabljate kaj drugega kot Google Chrome, boste morali v datoteki `.vscode/launch.json` kot nov parameter pod `sourceMaps` dodati `runtimeExecutable` s potjo do izvršljive datoteke vašega brskalnika, takole:
    ```json
    {
        "version": "0.2.0",
        "configurations": [
            {
            ...
            "sourceMaps": true,
            "runtimeExecutable": "/usr/bin/brave-browser-stable" <- v primeru brskalnika Brave na operacijskem sistemu Linux
            }
        ]
    }
    ```
2. V terminalu zaženite strežnik (npr. z ukazom `npm run dev`).
3. Dodajte zaustavitveno točko v kodo, kjer želite, da se program ustavi.
4. Premaknite se v meni `Run and Debug` (ikona predvajalnega gumba s hroščem) ali uporabite bližnjico `Ctrl + Shift + D`.
5. Kliknite gumb `Run` (zelena puščica) in počakajte, da se brskalnik odpre. Dostop do kontrol za razhroščevanje je na voljo prek menija, ki se ob razhroščevanju pojavi nad urejevalnikom kode.
6. Če želite program ponovno zagnati, je dovolj, da brskalnik osvežite; zaustavitvene točke pa lahko dodajate ali odstranjujete tudi med izvajanjem programa.