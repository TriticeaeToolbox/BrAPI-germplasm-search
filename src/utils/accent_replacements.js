/*
 * A list of character substitutions to replace unicode special characters,
 * such as accented letters, with their simplified ASCII characters.
 * 
 * This list was originally sourced from:
 * https://developer.wordpress.org/reference/functions/remove_accents/
 */

const replacements = {
  '£': [''],
  '€': ['E'],
  'ª': ['a'],
  'Á': ['A'],
  'á': ['a'],
  'À': ['A'],
  'à': ['a'],
  'Ă': ['A'],
  'ă': ['a'],
  'Ắ': ['A'],
  'ắ': ['a'],
  'Ằ': ['A'],
  'ằ': ['a'],
  'Ẵ': ['A'],
  'ẵ': ['a'],
  'Ẳ': ['A'],
  'ẳ': ['a'],
  'Â': ['A'],
  'â': ['a'],
  'Ấ': ['A'],
  'ấ': ['a'],
  'Ầ': ['A'],
  'ầ': ['a'],
  'Ẫ': ['A'],
  'ẫ': ['a'],
  'Ẩ': ['A'],
  'ẩ': ['a'],
  'Ǎ': ['A'],
  'ǎ': ['a'],
  'Å': ['A', 'Aa'],
  'å': ['a', 'aa'],
  'Ä': ['A', 'Ae'],
  'ä': ['a', 'ae'],
  'Ã': ['A'],
  'ã': ['a'],
  'Ą': ['A'],
  'ą': ['a'],
  'Ā': ['A'],
  'ā': ['a'],
  'Ả': ['A'],
  'ả': ['a'],
  'Ạ': ['A'],
  'ạ': ['a'],
  'Ặ': ['A'],
  'ặ': ['a'],
  'Ậ': ['A'],
  'ậ': ['a'],
  'Æ': ['AE', 'Ae'],
  'æ': ['ae'],
  'ɑ': ['a'],
  'Ć': ['C'],
  'ć': ['c'],
  'Ĉ': ['C'],
  'ĉ': ['c'],
  'Č': ['C'],
  'č': ['c'],
  'Ċ': ['C'],
  'ċ': ['c'],
  'Ç': ['C'],
  'ç': ['c'],
  'Ď': ['D'],
  'ď': ['d'],
  'Đ': ['D', 'DJ'],
  'đ': ['d', 'dj'],
  'Ð': ['D'],
  'ð': ['d'],
  'É': ['E'],
  'é': ['e'],
  'È': ['E'],
  'è': ['e'],
  'Ĕ': ['E'],
  'ĕ': ['e'],
  'Ê': ['E'],
  'ê': ['e'],
  'Ế': ['E'],
  'ế': ['e'],
  'Ề': ['E'],
  'ề': ['e'],
  'Ễ': ['E'],
  'ễ': ['e'],
  'Ể': ['E'],
  'ể': ['e'],
  'Ě': ['E'],
  'ě': ['e'],
  'Ë': ['E'],
  'ë': ['e'],
  'Ẽ': ['E'],
  'ẽ': ['e'],
  'Ė': ['E'],
  'ė': ['e'],
  'Ę': ['E'],
  'ę': ['e'],
  'Ē': ['E'],
  'ē': ['e'],
  'Ẻ': ['E'],
  'ẻ': ['e'],
  'Ẹ': ['E'],
  'ẹ': ['e'],
  'Ệ': ['E'],
  'ệ': ['e'],
  'ǝ': ['e'],
  'Ə': ['E'],
  'Ğ': ['G'],
  'ğ': ['g'],
  'Ĝ': ['G'],
  'ĝ': ['g'],
  'Ġ': ['G'],
  'ġ': ['g'],
  'Ģ': ['G'],
  'ģ': ['g'],
  'Ĥ': ['H'],
  'ĥ': ['h'],
  'Ħ': ['H'],
  'ħ': ['h'],
  'Í': ['I'],
  'í': ['i'],
  'Ì': ['I'],
  'ì': ['i'],
  'Ĭ': ['I'],
  'ĭ': ['i'],
  'Î': ['I'],
  'î': ['i'],
  'Ǐ': ['I'],
  'ǐ': ['i'],
  'Ï': ['I'],
  'ï': ['i'],
  'Ĩ': ['I'],
  'ĩ': ['i'],
  'İ': ['I'],
  'Į': ['I'],
  'į': ['i'],
  'Ī': ['I'],
  'ī': ['i'],
  'Ỉ': ['I'],
  'ỉ': ['i'],
  'Ị': ['I'],
  'ị': ['i'],
  'Ĳ': ['IJ'],
  'ĳ': ['ij'],
  'ı': ['i'],
  'Ĵ': ['J'],
  'ĵ': ['j'],
  'Ķ': ['K'],
  'ķ': ['k'],
  'Ĺ': ['L'],
  'ĺ': ['l'],
  'Ľ': ['L'],
  'ľ': ['l'],
  'Ļ': ['L'],
  'ļ': ['l'],
  'Ł': ['L'],
  'ł': ['l'],
  'Ŀ': ['L'],
  'ŀ': ['l'],
  'l·l': ['ll'],
  'Ń': ['N'],
  'ń': ['n'],
  'Ň': ['N'],
  'ň': ['n'],
  'Ñ': ['N'],
  'ñ': ['n'],
  'Ņ': ['N'],
  'ņ': ['n'],
  'Ŋ': ['N'],
  'ŋ': ['n'],
  'º': ['o'],
  'Ó': ['O'],
  'ó': ['o'],
  'Ò': ['O'],
  'ò': ['o'],
  'Ŏ': ['O'],
  'ŏ': ['o'],
  'Ô': ['O'],
  'ô': ['o'],
  'Ố': ['O'],
  'ố': ['o'],
  'Ồ': ['O'],
  'ồ': ['o'],
  'Ỗ': ['O'],
  'ỗ': ['o'],
  'Ổ': ['O'],
  'ổ': ['o'],
  'Ǒ': ['O'],
  'ǒ': ['o'],
  'Ö': ['O', 'Oe'],
  'ö': ['o', 'oe'],
  'Ő': ['O'],
  'ő': ['o'],
  'Õ': ['O'],
  'õ': ['o'],
  'ø': ['o', 'oe'],
  'Ø': ['O', 'Oe'],
  'Ō': ['O'],
  'ō': ['o'],
  'Ỏ': ['O'],
  'ỏ': ['o'],
  'Ơ': ['O'],
  'ơ': ['o'],
  'Ớ': ['O'],
  'ớ': ['o'],
  'Ờ': ['O'],
  'ờ': ['o'],
  'Ỡ': ['O'],
  'ỡ': ['o'],
  'Ở': ['O'],
  'ở': ['o'],
  'Ợ': ['O'],
  'ợ': ['o'],
  'Ọ': ['O'],
  'ọ': ['o'],
  'Ộ': ['O'],
  'ộ': ['o'],
  'Œ': ['OE'],
  'œ': ['oe'],
  'ĸ': ['k'],
  'Ŕ': ['R'],
  'ŕ': ['r'],
  'Ř': ['R'],
  'ř': ['r'],
  'Ŗ': ['R'],
  'ŗ': ['r'],
  'Ś': ['S'],
  'ś': ['s'],
  'Ŝ': ['S'],
  'ŝ': ['s'],
  'Š': ['S'],
  'š': ['s'],
  'Ş': ['S'],
  'ş': ['s'],
  'Ș': ['S'],
  'ș': ['s'],
  'ſ': ['s'],
  'ß': ['s', 'ss'],
  'Ť': ['T'],
  'ť': ['t'],
  'Ţ': ['T'],
  'ţ': ['t'],
  'Ț': ['T'],
  'ț': ['t'],
  'Ŧ': ['T'],
  'ŧ': ['t'],
  'Ú': ['U'],
  'ú': ['u'],
  'Ù': ['U'],
  'ù': ['u'],
  'Ŭ': ['U'],
  'ŭ': ['u'],
  'Û': ['U'],
  'û': ['u'],
  'Ǔ': ['U'],
  'ǔ': ['u'],
  'Ů': ['U'],
  'ů': ['u'],
  'Ü': ['U', 'Ue'],
  'ü': ['u', 'ue'],
  'Ǘ': ['U'],
  'ǘ': ['u'],
  'Ǜ': ['U'],
  'ǜ': ['u'],
  'Ǚ': ['U'],
  'ǚ': ['u'],
  'Ǖ': ['U'],
  'ǖ': ['u'],
  'Ű': ['U'],
  'ű': ['u'],
  'Ũ': ['U'],
  'ũ': ['u'],
  'Ų': ['U'],
  'ų': ['u'],
  'Ū': ['U'],
  'ū': ['u'],
  'Ủ': ['U'],
  'ủ': ['u'],
  'Ư': ['U'],
  'ư': ['u'],
  'Ứ': ['U'],
  'ứ': ['u'],
  'Ừ': ['U'],
  'ừ': ['u'],
  'Ữ': ['U'],
  'ữ': ['u'],
  'Ử': ['U'],
  'ử': ['u'],
  'Ự': ['U'],
  'ự': ['u'],
  'Ụ': ['U'],
  'ụ': ['u'],
  'Ŵ': ['W'],
  'ŵ': ['w'],
  'Ý': ['Y'],
  'ý': ['y'],
  'Ỳ': ['Y'],
  'ỳ': ['y'],
  'Ŷ': ['Y'],
  'ŷ': ['y'],
  'ÿ': ['y'],
  'Ÿ': ['Y'],
  'Ỹ': ['Y'],
  'ỹ': ['y'],
  'Ỷ': ['Y'],
  'ỷ': ['y'],
  'Ỵ': ['Y'],
  'ỵ': ['y'],
  'Ź': ['Z'],
  'ź': ['z'],
  'Ž': ['Z'],
  'ž': ['z'],
  'Ż': ['Z'],
  'ż': ['z'],
  'Þ': ['TH'],
  'þ': ['th'],
  'ŉ': ['n']
}

module.exports = replacements;