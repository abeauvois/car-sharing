import { describe, expect, it } from "bun:test";

import * as aq from 'arquero';
import { getPropertyInSentenceFromList, getValidIndices, keepValidColumns } from './ai.ts'

describe('getValidIndices', () => {
  it('should remove columns with long content over 200 characters', () => {

    const data = {
      id: "any id",
      name: "<NAME>",
      description: "A really long description over 200 characters kldsjslkjd smlfsmlf should not be removed zdflzkdfelkj kldz jlzdj fzldkjf lkds qskldj flksdfj slkdj lf kjsldkj fsldkjf lqdjflsdkjf sldk flsdkf lsdkjf ls lsdksjfsldj flsd lsd fkjfldskjfsl"
    }

    const result = getValidIndices(data);

    expect(result).toEqual([0, 1]);
  });

  it('should remove columns with multiple lines', () => {
    const data = {
      id: "any id",
      name: "<NAME>",
      description: "A multi line \n description that should be removed"
    }

    const result = getValidIndices(data);

    expect(result).toEqual([0, 1]);
  });

  it('should handle empty data', () => {
    const data = {
      id: "any id",
      name: "",
      description: "A multi line description that should be removed"
    }

    const result = getValidIndices(data);

    expect(result).toEqual([0, 1, 2]);
  });


});

// when the llm is not respecting the ouput format, we can force it to return the closest property from a list of properties
describe('getPropertyInSentenceFromList', () => {
  it('should find in a sentence a property that is in the properties list', () => {
    const domainPropertiesList = ["seller", "price", "description"];

    const sentence = `On examining the array ["Pro","","Pro"], I'm guessing that the common property is "seller"`

    const result = getPropertyInSentenceFromList( domainPropertiesList,[], sentence);

    expect(result).toEqual("seller");
  });

  it('should add an incremental suffix to a property already in the found properties list', () => {
    const foundProperties = ["url"];
    const domainPropertiesList = ["url", "seller", "price", "description"];

    const sentence = `On examining the array ["http:",""], I'm guessing that the common property is "url"`

    const result = getPropertyInSentenceFromList( domainPropertiesList, foundProperties, sentence);

    expect(result).toEqual("url_1");
  });

  it('should add the correct suffix to a property already in the found properties list', () => {
    const foundProperties = ["url", "url_1"];
    const domainPropertiesList = ["url", "seller", "price", "description"];

    const sentence = `On examining the array ["http:",""], I'm guessing that the common property is "url"`

    const result = getPropertyInSentenceFromList( domainPropertiesList, foundProperties, sentence);

    expect(result).toEqual("url_2");
  });

});