import 'whatwg-fetch';
import './Autosuggest.scss';
import { removeClass } from '../helpers/removeClass';
import { addClass } from '../helpers/addClass';
import { htmlTemplate } from '../helpers/htmlTemplate';

class SearchJson {
  constructor(options) {
    this.options = options;
    this.initialSearch(this.options);
    this.keyCode = {
      esc: 27,
      enter: 13,
      keyUp: 40,
      keyDown: 38,
    };
  }

  initialSearch({
    delay,
    search,
    searchOutputUl,
    searchBy,
    error,
    isLoading,
    isActive,
    activeList,
    placeholderError,
    howManyCharacters,
  }) {
    let timeout;

    this.searchOutputUl = searchOutputUl || 'output-list';
    this.placeholderError = placeholderError || 'something went wrong...';
    this.errorClass = error || 'error';
    this.isLoading = isLoading || 'loading';
    this.searchId = document.getElementById(search);
    this.delay = delay || 1000;
    this.isActive = isActive || 'active';
    this.howManyCharacters = howManyCharacters || 1;
    this.activeList = activeList || 'active-list';
    this.createOutputSearch(search);

    this.searchId.addEventListener('input', e => {
      this.valueFromSearch = e.target.value;
      this.classSearch = e.target.parentNode;

      const escapedChar = this.valueFromSearch.replace(
        // eslint-disable-next-line no-useless-escape
        /[`~!@#$%^&*()_|+\-=÷¿?;:'",.<>\{\}\[\]\\\/]/gi,
        ''
      );

      if (escapedChar.length > this.howManyCharacters) {
        this.searchId.parentNode.classList.add(this.isLoading);
        if (!timeout) {
          timeout = setTimeout(() => {
            this.searchCountry(escapedChar, searchBy);
            timeout = null;
          }, this.delay);
        }
      } else {
        removeClass(this.matchList, this.isActive);
      }
      removeClass(this.searchId, this.errorClass);
    });
  }

  // create output-list and put after search input
  createOutputSearch(search) {
    const outputAfterSearch = `${search}-auto`;
    const outputSearch = document.createElement('div');
    outputSearch.id = outputAfterSearch;
    outputSearch.className = 'output-search';
    this.searchId.parentNode.insertBefore(
      outputSearch,
      this.searchId.nextSibling
    );

    this.matchList = document.getElementById(outputAfterSearch);
  }

  // hide output div when click on li or press escape
  closeOutputMatchesList(search) {
    document.addEventListener('click', e => {
      e.stopPropagation();
      const itemActive = document.querySelector(`.${this.isActive}`);
      if (e.target.id !== search) {
        if (itemActive) {
          removeClass(itemActive, this.isActive);
        }
      }
    });
    // close outpu list when press ESC
    document.addEventListener('keyup', e => {
      if (e.keyCode === this.keyCode.esc) {
        const itemActive = document.querySelector(`.${this.isActive}`);
        if (itemActive) {
          removeClass(itemActive, this.isActive);
        }
      }
    });
  }

  // preparation of the list
  outputHtml(matches) {
    if (matches.length > 1) {
      const { howManyRecordsShow, searchBy, specificOutput } = this.options;

      const rowMax = howManyRecordsShow || 10;

      const html = matches
        .filter((test, index) => index > 0 && index <= rowMax)
        .map(match => {
          const htmlTemp = specificOutput
            ? specificOutput({ ...match, matches })
            : htmlTemplate({ match, matches, searchBy });
          return htmlTemp;
        })
        .join('');

      this.matchList.innerHTML = `<ul id="${this.searchOutputUl}">${html}</ul>`;

      addClass(this.matchList, this.isActive);
      this.addTextFromLiToSearchInput();
      this.keyUpInsideUl();
      this.mouseActiveListItem(this.options);
      this.closeOutputMatchesList(this.options);
    }
  }

  // adding text from list when enter
  addTextFromLiToSearchInput() {
    document.addEventListener('keyup', e => {
      e.preventDefault();
      if (this.valueFromSearch.length) {
        const itemActive = document.querySelector(`li.${this.activeList} > a`);
        if (e.keyCode === this.keyCode.enter && itemActive != null) {
          const item = e.target;
          document.getElementById(item.id).value = itemActive.innerText.trim();
          document.getElementById(this.searchOutputUl).outerHTML = '';
          removeClass(item.nextSibling, this.isActive);
          removeClass(itemActive, this.activeList);
        }
      }
    });
  }

  // setting the active list with the mouse
  mouseActiveListItem({ search }) {
    const searchOutputUlLi = document.querySelectorAll(
      `#${this.searchOutputUl} > li`
    );
    for (let i = 0; i < searchOutputUlLi.length; i++) {
      searchOutputUlLi[i].addEventListener('mouseenter', e => {
        const itemActive = document.querySelector(`li.${this.activeList}`);
        if (itemActive) {
          removeClass(itemActive, this.activeList);
        }
        e.target.classList.add(this.activeList);
      });
    }
    this.mouseAddListItemToSearchInput(search);
  }

  // add text from list when click mouse
  // eslint-disable-next-line class-methods-use-this
  mouseAddListItemToSearchInput(search) {
    const searchOutpuli = document.getElementById(this.searchOutputUl);
    searchOutpuli.addEventListener('click', e => {
      e.preventDefault();
      const item = document.querySelector(`li.${this.activeList} > a`)
        .innerText;
      document.getElementById(search).value = item.trim();
      searchOutpuli.outerHTML = '';
    });
  }

  // navigating the elements li
  keyUpInsideUl() {
    let selected = 0;
    const itemsLi = document.querySelectorAll(`#${this.searchOutputUl} > li`);

    if (itemsLi.length >= 1) {
      this.searchId.addEventListener('keydown', e => {
        const itemActive = document.querySelector(`li.${this.activeList}`);
        switch (e.keyCode) {
          case this.keyCode.keyUp: {
            selected++;
            if (selected > itemsLi.length) {
              selected = 1;
            }
            if (itemActive) {
              removeClass(itemActive, this.activeList);
            }
            itemsLi[selected - 1].classList.add(this.activeList);
            break;
          }
          case this.keyCode.keyDown: {
            selected--;
            if (selected <= 0) {
              selected = itemsLi.length;
            }
            if (itemActive) {
              removeClass(itemActive, this.activeList);
            }
            itemsLi[selected - 1].classList.add(this.activeList);
            break;
          }
          default:
            break;
        }
      });
    }
  }

  // The async function gets the text from the search
  // and returns the matching array
  async searchCountry(searchText, searchBy) {
    try {
      const res = await fetch(this.options.urlPath + searchText);
      const jsonData = await res.json();

      let matches = jsonData.filter(element => {
        const regex = new RegExp(`^${searchText}`, 'gi');
        return element[searchBy].match(regex);
      });

      if (searchText.length === 0) {
        matches = [];
        this.matchList.innerHTML = '';
      }

      matches = [searchText, ...matches];
      removeClass(this.classSearch, this.isLoading);
      this.outputHtml(matches);
    } catch (err) {
      removeClass(this.classSearch, this.isLoading);
      this.searchId.value = '';
      this.searchId.classList.add(this.errorClass);
      this.searchId.placeholder = this.placeholderError;
    }
  }
}

export default SearchJson;
