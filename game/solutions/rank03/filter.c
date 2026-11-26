//# headers | Headers & BUFFER_SIZE
//! Everything the file needs before any code: the GNU switch, the headers for the allowed functions, and a default read size.
//? Turn on the GNU extras, before any header || memmem is a GNU extension. The define only works if it comes first.
#define _GNU_SOURCE
//? Header for errno || perror prints the message that belongs to errno.
#include <errno.h>
//? Header for perror
#include <stdio.h>
//? Header for realloc and free
#include <stdlib.h>
//? Header for strlen and memmove
#include <string.h>
//? Header for read and write
#include <unistd.h>

//? Only if nobody chose a read size at compile time... || The grader may compile with -D BUFFER_SIZE=xx. This guard keeps their value.
#ifndef BUFFER_SIZE
//? ...pick a default read size
# define BUFFER_SIZE 42
//? Close the guard
#endif

//# ft_filter | ft_filter()
//! Walk through the text. Wherever the word starts, print one star per letter and jump past it. Otherwise print the character as it is.
//? Declare the function: it gets the whole text and the word to hide
void	ft_filter(char *buf, char *target)
{
//? Remember how long the word is || Needed twice: to know a full match happened, and to jump over it.
	int	len = strlen(target);
//? Start a position in the text at 0
	int	i = 0;
//? Declare a counter for matched letters
	int	j;

//? Repeat until the end of the text
	while (buf[i])
	{
//? Start a fresh comparison: zero letters matched
		j = 0;
//? While the word has letters left and the text matches at this spot... || buf[i + j] is the text, j letters after where we stand.
		while (target[j] && buf[i + j] == target[j])
//? ...count one more matching letter
			j++;
//? Did every letter of the word match?
		if (j == len)
		{
//? Once per letter of the word...
			while (j-- > 0)
//? ...print one star
				write(1, "*", 1);
//? Jump over the whole word in the text || Otherwise its letters would be looked at again.
			i += len;
		}
//? If the word does not start here
		else
//? Print this one character and step forward || i++ moves on after the character was used.
			write(1, &buf[i++], 1);
	}
}

//# main_read | main() · read loop
//! Check the argument, then read all of stdin into one growing string, one buffer-full at a time.
//? Start main with the argument count and values
int	main(int argc, char **argv)
{
//? A small array on the stack: each read lands here
	char	tmp[BUFFER_SIZE];
//? The whole input so far: nothing yet || NULL matters: realloc(NULL, n) behaves like malloc.
	char	*res = NULL;
//? A spare pointer for the result of realloc || If realloc fails, the old pointer is still needed to free it.
	char	*new;
//? How many bytes are stored so far: none
	int		total = 0;
//? How many bytes the last read gave || ssize_t because read returns -1 on error.
	ssize_t	bytes;

//? Is there not exactly one argument, or is it empty?
	if (argc != 2 || !argv[1][0])
//? Exit with an error
		return (1);
//? Read up to one buffer from stdin, and loop while something came in || 0 means end of input, a negative value means error. Both end the loop.
	while ((bytes = read(0, tmp, BUFFER_SIZE)) > 0)
	{
//? Grow the big string: old size + new bytes + 1 for the end mark
		new = realloc(res, total + bytes + 1);
//? Did growing fail?
		if (!new)
		{
//? Give back what we had
			free(res);
//? Print the error message
			perror("Error");
//? Exit with an error
			return (1);
		}
//? Growing worked: keep the new pointer
		res = new;
//? Copy the fresh bytes to the end of the big string || res + total is the first free spot.
		memmove(res + total, tmp, bytes);
//? Count the new bytes
		total += bytes;
//? Put the end mark after the last byte || ft_filter stops on this mark.
		res[total] = '\0';
	}
//# main_end | main() · errors & output
//! After the loop: handle a read error, handle empty input, otherwise filter and clean up.
//? Did the loop end because read failed?
	if (bytes < 0)
	{
//? Give back the string
		free(res);
//? Print the error message
		perror("Error");
//? Exit with an error
		return (1);
	}
//? Was there no input at all?
	if (!res)
//? Nothing to print: exit normally
		return (0);
//? Print the text with the word starred out
	ft_filter(res, argv[1]);
//? Free the string
	free(res);
//? Done: success
	return (0);
}
