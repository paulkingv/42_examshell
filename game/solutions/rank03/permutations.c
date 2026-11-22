//# headers | Headers
//! Two headers: one for printing, one for memory.
//? Header for puts
#include <stdio.h>
//? Header for calloc and free
#include <stdlib.h>

//# ft_strlen | ft_strlen()
//! Count the characters of a string.
//? Declare: it takes a string and returns its length
int	ft_strlen(char *s)
{
//? The count starts at 0
	int	i = 0;

//? While the character at the count is not the end mark
	while (s[i])
//? Count one more
		i++;
//? Return the count
	return (i);
}

//# sort | sort()
//! Put the letters in alphabetical order, so the permutations come out in order too.
//? Declare: it sorts the string in place
void	sort(char *s)
{
//? Start at the first letter
	int		i = 0;
//? Declare a second index
	int		j;
//? A spare char for swapping
	char	tmp;

//? For every position i
	while (s[i])
	{
//? Start comparing with the letter right after it
		j = i + 1;
//? For every later letter
		while (s[j])
		{
//? Is the later letter smaller?
			if (s[i] > s[j])
			{
//? Save the letter at i
				tmp = s[i];
//? Put the smaller letter at i
				s[i] = s[j];
//? Put the saved letter where the small one was
				s[j] = tmp;
			}
//? Next later letter
			j++;
		}
//? Next position || After each pass, position i holds the smallest letter that was left.
		i++;
	}
}

//# is_used | is_used()
//! Is the letter c already in the part of the result that is filled (the first pos letters)?
//? Declare: the result, the letter to look for, and how many letters are filled
int	is_used(char *res, char c, int pos)
{
//? Start at the first filled letter
	int	i = 0;

//? For every letter already placed
	while (i < pos)
	{
//? Is it the same letter?
		if (res[i] == c)
//? Yes: already used
			return (1);
//? Next placed letter
		i++;
	}
//? Not found: the letter is free
	return (0);
}

//# permute | permute()
//! Fill the result one position at a time. For each position, try every letter that is not used yet, in order.
//? Declare: the sorted letters, the result, the length, and the position to fill
void	permute(char *src, char *res, int len, int pos)
{
//? Start with the first letter
	int	i = 0;

//? Is every position filled?
	if (pos == len)
	{
//? Print this permutation
		puts(res);
//? Go back and try others
		return ;
	}
//? Try every letter
	while (i < len)
	{
//? Is this letter still free?
		if (!is_used(res, src[i], pos))
		{
//? Put it at the current position
			res[pos] = src[i];
//? Fill the next position || When it returns, the next free letter overwrites this position. That is the undo.
			permute(src, res, len, pos + 1);
		}
//? Next letter
		i++;
	}
}

//# main | main()
//! Check the argument, make room for the result, sort the letters, start at position 0.
//? Start main with the argument count and values
int	main(int argc, char **argv)
{
//? Declare the length
	int		len;
//? Declare the result string
	char	*res;

//? Not exactly one argument, or an empty one?
	if (argc != 2 || !argv[1][0])
//? Exit with an error
		return (1);
//? Measure the word
	len = ft_strlen(argv[1]);
//? Allocate the result, filled with zeros, with room for the end mark || calloc zeroes the memory, so the string is already closed.
	res = calloc(len + 1, 1);
//? Did the allocation fail?
	if (!res)
//? Exit with an error
		return (1);
//? Sort the letters of the argument
	sort(argv[1]);
//? Start filling at position 0
	permute(argv[1], res, len, 0);
//? Free the result
	free(res);
//? Done: success
	return (0);
}
