//# headers | Header include | given
//! Given by the exam: the header brings in read, malloc, free and BUFFER_SIZE.
#include "get_next_line.h"

//# ft_strchr | ft_strchr() · fixed
//! Find the first place where c appears in s. The broken version ran past the end of the string.
//? Declare: a string and the character to find
char	*ft_strchr(char *s, int c)
{
//? Start at position 0
	int	i = 0;

//? Walk forward while the string goes on and this is not the character || The fix: the original never checked for the end of the string.
	while (s[i] && s[i] != c)
//? Step to the next position
		i++;
//? Did we stop on the character?
	if (s[i] == c)
//? Return a pointer to that spot
		return (s + i);
//? Otherwise it is not in the string
	return (NULL);
}

//# ft_memcpy | ft_memcpy() · fixed
//! Copy n bytes from src to dest, going from the last byte down to the first.
//? Declare: destination, source and a byte count
void	*ft_memcpy(void *dest, const void *src, size_t n)
{
//? Loop n times, counting n down || The test reads n, then lowers it. Inside the loop n runs from the last index down to 0.
	while (n-- > 0)
//? Copy the byte at index n || The original skipped the last byte and broke when n was 0.
		((char *)dest)[n] = ((char *)src)[n];
//? Return the destination
	return (dest);
}

//# ft_strlen | ft_strlen() · fixed
//! Count the characters of a string. The fix: a NULL string counts as 0 instead of crashing.
//? Declare: it takes a string and returns a size
size_t	ft_strlen(char *s)
{
//? The count starts at 0
	size_t	res = 0;

//? Is there no string at all? || The line starts as NULL, and str_append_mem asks for its length.
	if (!s)
//? Then its length is 0
		return (0);
//? While the character at the count is not the end mark
	while (s[res])
//? Count one more
		res++;
//? Return the count
	return (res);
}

//# str_append_mem | str_append_mem() | given
//! Given by the exam: builds a new string = old line + size2 bytes of s2, and frees the old one. It relies on your ft_strlen accepting NULL.
int	str_append_mem(char **s1, char *s2, size_t size2)
{
	size_t	size1 = ft_strlen(*s1);
	char	*tmp = malloc(size2 + size1 + 1);

	if (!tmp)
		return (0);
	ft_memcpy(tmp, *s1, size1);
	ft_memcpy(tmp + size1, s2, size2);
	tmp[size1 + size2] = '\0';
	free(*s1);
	*s1 = tmp;
	return (1);
}

//# str_append_str | str_append_str() | given
//! Given by the exam: the same, for a whole string.
int	str_append_str(char **s1, char *s2)
{
	return (str_append_mem(s1, s2, ft_strlen(s2)));
}

//# ft_memmove | ft_memmove() · fixed
//! Copy n bytes when the two areas may overlap: pick the direction that never overwrites bytes still to be copied.
//? Declare: destination, source and a byte count
void	*ft_memmove(void *dest, const void *src, size_t n)
{
//? A forward index, starting at 0
	size_t	i = 0;

//? Is the destination after the source?
	if (dest > src)
//? Then copy backwards: ft_memcpy already goes from the last byte down || The original called itself here and never returned.
		return (ft_memcpy(dest, src, n));
//? Otherwise go forward through the n bytes
	while (i < n)
	{
//? Copy one byte
		((char *)dest)[i] = ((char *)src)[i];
//? Next byte
		i++;
	}
//? Return the destination
	return (dest);
}

//# gnl_loop | get_next_line() · read loop
//! Keep a leftover buffer between calls. Until it contains a line break, add it to the line and refill it from the file.
//? Declare: it takes a file descriptor and returns one line
char	*get_next_line(int fd)
{
//? The leftover buffer: it must survive between calls, and starts empty || static keeps the content after the function returns. The +1 leaves room for the end mark.
	static char	b[BUFFER_SIZE + 1] = "";
//? The line being built: nothing yet
	char		*ret = NULL;
//? Look for a line break in what is left from the last call
	char		*tmp = ft_strchr(b, '\n');
//? Declare a variable for the result of read
	int			read_ret;

//? As long as the buffer holds no line break
	while (!tmp)
	{
//? Add the whole buffer to the line. If that fails...
		if (!str_append_str(&ret, b))
//? ...give up
			return (NULL);
//? Refill the buffer from the file
		read_ret = read(fd, b, BUFFER_SIZE);
//? End of file or read error? || The original only checked -1, so it looped forever at the end of the file.
		if (read_ret <= 0)
		{
//? Empty the buffer || Its content is already in the line. It must not be handed out twice.
			b[0] = '\0';
//? Clean end of file, and the line has some text?
			if (read_ret == 0 && ret && *ret)
//? Return that last line, even without a line break
				return (ret);
//? Otherwise free the line
			free(ret);
//? ...and report that nothing is left
			return (NULL);
		}
//? Put the end mark after the bytes that were read
		b[read_ret] = '\0';
//? Look for a line break again || The fix that matters most: the original never searched again, so the loop never ended.
		tmp = ft_strchr(b, '\n');
	}
//# gnl_end | get_next_line() · return the line
//! A line break is in the buffer: add everything up to it to the line, then keep what comes after for the next call.
//? Add the buffer up to and including the line break. If that fails... || tmp - b is how far the break is from the start. The +1 includes the break itself.
	if (!str_append_mem(&ret, b, tmp - b + 1))
	{
//? ...free the line
		free(ret);
//? ...and give up
		return (NULL);
	}
//? Slide what comes after the break to the front of the buffer || The +1 on the length carries the end mark along. The original forgot this step, so the same text came back.
	ft_memmove(b, tmp + 1, ft_strlen(tmp + 1) + 1);
//? Return the finished line
	return (ret);
}
